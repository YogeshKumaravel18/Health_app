/**
 * BLEContext — Native (Android / iOS) build with real Firebolt BLE support
 *
 * Firebolt watches run the Da Fit / HBand ecosystem and expose two paths:
 *
 *  1. Standard GATT Heart Rate Service (UUID 0x180D)
 *     • HR Measurement characteristic 0x2A37 — notify, gives BPM
 *
 *  2. Custom Da Fit proprietary service (fee0 family)
 *     • Write to 0xfee1 to trigger measurements
 *     • Receive results on 0xfee2 notify characteristic
 *     • Commands: [0x01, 0x08] = request HR, [0x01, 0x09] = request SpO2
 *     • Response: [category, sub-cmd, value]
 *
 * Some Firebolt models use the alternate fee7 family instead of fee0.
 *
 * Falls back to simulation if no watch is found within 15 seconds or if the
 * user chooses to skip pairing.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { BleManager, State } from "react-native-ble-plx";

import type { BLEContextType, VitalsData } from "./BLEContext";

export type { VitalsData, BLEContextType };

// ---------------------------------------------------------------------------
// Firebolt / Da Fit BLE UUIDs
// ---------------------------------------------------------------------------
const HR_SERVICE = "0000180d-0000-1000-8000-00805f9b34fb";
const HR_MEASUREMENT = "00002a37-0000-1000-8000-00805f9b34fb";

const DAFIT_SERVICE = "0000fee0-0000-1000-8000-00805f9b34fb";
const DAFIT_WRITE = "0000fee1-0000-1000-8000-00805f9b34fb";
const DAFIT_NOTIFY = "0000fee2-0000-1000-8000-00805f9b34fb";

const DAFIT_SERVICE_ALT = "0000fee7-0000-1000-8000-00805f9b34fb";
const DAFIT_WRITE_ALT = "0000fee8-0000-1000-8000-00805f9b34fb";
const DAFIT_NOTIFY_ALT = "0000fee9-0000-1000-8000-00805f9b34fb";

// Commands to write to the watch — encode as base64
function b64(bytes: number[]): string {
  return btoa(bytes.map((b) => String.fromCharCode(b)).join(""));
}
const CMD_HR = b64([0x01, 0x08]);
const CMD_SPO2 = b64([0x01, 0x09]);
const CMD_HR_CONTINUOUS_START = b64([0x04, 0x01]);

// Name fragments identifying a Firebolt / Fire-Boltt watch
const FIREBOLT_PATTERNS = [
  "fire-boltt", "fireboltt", "firebolt", "fire boltt",
  "bsw", "dafit", "da fit", "hband",
];

function isFirebolt(name: string | null | undefined): boolean {
  if (!name) return false;
  const l = name.toLowerCase();
  return FIREBOLT_PATTERNS.some((p) => l.includes(p));
}

// ---------------------------------------------------------------------------
// Packet parsers
// ---------------------------------------------------------------------------
function parseHRGatt(b64val: string): number | null {
  try {
    const bytes = Uint8Array.from(atob(b64val), (c) => c.charCodeAt(0));
    if (bytes.length < 2) return null;
    const is16 = bytes[0] & 0x01;
    const hr = is16 ? ((bytes[2] << 8) | bytes[1]) : bytes[1];
    return hr > 0 && hr < 300 ? hr : null;
  } catch { return null; }
}

function parseDaFit(b64val: string): { heartRate?: number; oxygenLevel?: number } {
  try {
    const bytes = Uint8Array.from(atob(b64val), (c) => c.charCodeAt(0));
    if (bytes.length < 3 || bytes[0] !== 0x01) return {};
    const [, sub, val] = bytes;
    if (sub === 0x08 && val > 0 && val < 250) return { heartRate: val };
    if (sub === 0x09 && val > 0 && val <= 100) return { oxygenLevel: val };
    return {};
  } catch { return {}; }
}

// ---------------------------------------------------------------------------
// Simulation fallback
// ---------------------------------------------------------------------------
function simulateVitals(prev: VitalsData | null): VitalsData {
  const f = (v: number, r: number) => Math.round((v + (Math.random() - 0.5) * r) * 10) / 10;
  const b = prev ?? { heartRate: 72, systolicBP: 120, diastolicBP: 80, oxygenLevel: 98, temperature: 36.8 };
  return {
    heartRate: Math.max(45, Math.min(160, f(b.heartRate, 4))),
    systolicBP: Math.max(80, Math.min(180, f(b.systolicBP, 3))),
    diastolicBP: Math.max(50, Math.min(110, f(b.diastolicBP, 2))),
    oxygenLevel: Math.max(88, Math.min(100, f(b.oxygenLevel, 0.5))),
    temperature: Math.max(34.5, Math.min(40.5, f(b.temperature, 0.1))),
    timestamp: new Date(),
  };
}

interface BLEDevice { id: string; name: string; connected: boolean; }

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const BLEContext = createContext<BLEContextType | null>(null);

// Single BleManager instance for the lifetime of the app
const manager = new BleManager();

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<BLEDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [vitals, setVitals] = useState<VitalsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionMode, setConnectionMode] = useState<"real" | "simulated">("simulated");

  const vitalsRef = useRef<VitalsData | null>(null);
  const simulatorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spo2TimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const writeServiceRef = useRef(DAFIT_SERVICE);
  const writeCharRef = useRef(DAFIT_WRITE);
  const notifyCharRef = useRef(DAFIT_NOTIFY);

  // ── helpers ──────────────────────────────────────────────────────────────

  const patchVitals = useCallback((patch: Partial<VitalsData>) => {
    const now = new Date();
    setVitals((prev) => {
      const next: VitalsData = {
        heartRate: prev?.heartRate ?? 72,
        systolicBP: prev?.systolicBP ?? 120,
        diastolicBP: prev?.diastolicBP ?? 80,
        oxygenLevel: prev?.oxygenLevel ?? 98,
        temperature: prev?.temperature ?? 36.8,
        timestamp: now,
        ...patch,
      };
      vitalsRef.current = next;
      return next;
    });
    setLastUpdated(now);
  }, []);

  const stopSimulator = useCallback(() => {
    if (simulatorRef.current) { clearInterval(simulatorRef.current); simulatorRef.current = null; }
  }, []);

  const startSimulator = useCallback(() => {
    stopSimulator();
    simulatorRef.current = setInterval(() => {
      const next = simulateVitals(vitalsRef.current);
      vitalsRef.current = next;
      setVitals(next);
      setLastUpdated(next.timestamp);
    }, 5000);
  }, [stopSimulator]);

  const stopSpO2 = useCallback(() => {
    if (spo2TimerRef.current) { clearInterval(spo2TimerRef.current); spo2TimerRef.current = null; }
  }, []);

  const startSpO2 = useCallback((id: string) => {
    stopSpO2();
    const request = () =>
      manager
        .writeCharacteristicWithResponseForDevice(id, writeServiceRef.current, writeCharRef.current, CMD_SPO2)
        .catch(() => {});
    request();
    spo2TimerRef.current = setInterval(request, 30_000);
  }, [stopSpO2]);

  // ── simulation fallback ───────────────────────────────────────────────────

  const connectSimulated = useCallback(async () => {
    setIsConnecting(true);
    await new Promise((r) => setTimeout(r, 1600));
    setDevice({ id: "sim-firebolt-001", name: "Firebolt (Simulated)", connected: true });
    setIsConnected(true);
    setConnectionMode("simulated");
    setIsConnecting(false);
    startSimulator();
  }, [startSimulator]);

  // ── real BLE connect ──────────────────────────────────────────────────────

  const connectToDevice = useCallback(
    async (id: string, name: string) => {
      setIsConnecting(true);
      try {
        const conn = await manager.connectToDevice(id, { autoConnect: false, requestMTU: 512 });
        await conn.discoverAllServicesAndCharacteristics();

        const services = await conn.services();
        const uuids = services.map((s) => s.uuid.toLowerCase());

        // Detect which Da Fit variant (fee0 vs fee7)
        if (uuids.includes(DAFIT_SERVICE_ALT)) {
          writeServiceRef.current = DAFIT_SERVICE_ALT;
          writeCharRef.current = DAFIT_WRITE_ALT;
          notifyCharRef.current = DAFIT_NOTIFY_ALT;
        }

        // ── Standard HR notifications ──
        if (uuids.includes(HR_SERVICE)) {
          manager.monitorCharacteristicForDevice(id, HR_SERVICE, HR_MEASUREMENT, (err, char) => {
            if (err || !char?.value) return;
            const hr = parseHRGatt(char.value);
            if (hr !== null) patchVitals({ heartRate: hr });
          });
          // Ask watch to start continuous HR monitoring
          manager
            .writeCharacteristicWithResponseForDevice(id, writeServiceRef.current, writeCharRef.current, CMD_HR_CONTINUOUS_START)
            .catch(() => {});
        }

        // ── Da Fit proprietary notifications (SpO2, HR fallback) ──
        if (uuids.includes(writeServiceRef.current)) {
          manager.monitorCharacteristicForDevice(
            id, writeServiceRef.current, notifyCharRef.current,
            (err, char) => {
              if (err || !char?.value) return;
              const parsed = parseDaFit(char.value);
              if (parsed.heartRate !== undefined) patchVitals({ heartRate: parsed.heartRate });
              if (parsed.oxygenLevel !== undefined) patchVitals({ oxygenLevel: parsed.oxygenLevel });
            }
          );
          // Also request HR via custom command as a second source
          manager
            .writeCharacteristicWithResponseForDevice(id, writeServiceRef.current, writeCharRef.current, CMD_HR)
            .catch(() => {});
          startSpO2(id);
        }

        // ── On disconnect: fall back to simulator ──
        deviceIdRef.current = id;
        manager.onDeviceDisconnected(id, () => {
          setIsConnected(false);
          setDevice(null);
          setConnectionMode("simulated");
          stopSpO2();
          startSimulator();
          deviceIdRef.current = null;
        });

        // Seed with realistic values immediately while waiting for first real reading
        const seed = simulateVitals(null);
        vitalsRef.current = seed;
        setVitals(seed);
        setLastUpdated(seed.timestamp);

        setDevice({ id, name, connected: true });
        setIsConnected(true);
        setConnectionMode("real");
        setIsConnecting(false);
      } catch (err) {
        setIsConnecting(false);
        throw err;
      }
    },
    [patchVitals, startSpO2, stopSpO2, startSimulator]
  );

  // ── public: connect ───────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    const btState = await manager.state();
    if (btState !== State.PoweredOn) {
      Alert.alert(
        "Bluetooth Off",
        "Please turn on Bluetooth to connect to your Firebolt watch.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsScanning(true);
    setIsConnecting(true);
    let found = false;

    manager.startDeviceScan(null, { allowDuplicates: false }, async (err, scanned) => {
      if (err) {
        setIsScanning(false);
        setIsConnecting(false);
        Alert.alert("Scan Error", err.message);
        return;
      }
      if (!scanned || !isFirebolt(scanned.name)) return;

      found = true;
      manager.stopDeviceScan();
      setIsScanning(false);

      try {
        await connectToDevice(scanned.id, scanned.name ?? "Firebolt Watch");
      } catch {
        Alert.alert(
          "Connection Failed",
          "Could not connect to your Firebolt watch. Make sure it is nearby and the Da Fit app is closed.",
          [
            { text: "Try Again", onPress: connect },
            { text: "Use Simulation", onPress: connectSimulated },
          ]
        );
      }
    });

    // 15 s timeout → fall back to simulation prompt
    setTimeout(() => {
      if (!found) {
        manager.stopDeviceScan();
        setIsScanning(false);
        setIsConnecting(false);
        Alert.alert(
          "Watch Not Found",
          "No Firebolt watch was detected nearby.\n\nTips:\n• Wake your watch (tap the screen)\n• Close the Da Fit app\n• Keep the watch within 1 metre",
          [
            { text: "Try Again", onPress: connect },
            { text: "Use Simulation", onPress: connectSimulated },
          ]
        );
      }
    }, 15_000);
  }, [connectToDevice, connectSimulated]);

  // ── public: disconnect ────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    stopSimulator();
    stopSpO2();
    manager.stopDeviceScan();
    if (deviceIdRef.current) {
      manager.cancelDeviceConnection(deviceIdRef.current).catch(() => {});
      deviceIdRef.current = null;
    }
    setIsConnected(false);
    setDevice(null);
    setConnectionMode("simulated");
    setIsScanning(false);
    setIsConnecting(false);
  }, [stopSimulator, stopSpO2]);

  // Cleanup on unmount
  useEffect(() => () => { stopSimulator(); stopSpO2(); }, [stopSimulator, stopSpO2]);

  return (
    <BLEContext.Provider value={{ device, isConnected, isConnecting, isScanning, vitals, lastUpdated, connectionMode, connect, disconnect }}>
      {children}
    </BLEContext.Provider>
  );
}

export function useBLE() {
  const ctx = useContext(BLEContext);
  if (!ctx) throw new Error("useBLE must be used within BLEProvider");
  return ctx;
}

export { BLEProvider as default };
