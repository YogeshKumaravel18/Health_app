/**
 * BLEContext — Web / Simulation-only build
 *
 * On web, real Bluetooth APIs are unavailable, so this version always runs
 * the vitals simulator. Metro automatically picks BLEContext.native.tsx on
 * Android / iOS, so this file is only ever bundled for the web target.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface VitalsData {
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  oxygenLevel: number;
  temperature: number;
  timestamp: Date;
}

interface BLEDevice {
  id: string;
  name: string;
  connected: boolean;
}

export interface BLEContextType {
  device: BLEDevice | null;
  isConnected: boolean;
  isConnecting: boolean;
  isScanning: boolean;
  vitals: VitalsData | null;
  lastUpdated: Date | null;
  connectionMode: "real" | "simulated";
  connect: () => Promise<void>;
  disconnect: () => void;
}

const BLEContext = createContext<BLEContextType | null>(null);

function simulateVitals(prev: VitalsData | null): VitalsData {
  const fluctuate = (val: number, range: number) =>
    Math.round((val + (Math.random() - 0.5) * range) * 10) / 10;
  const base = prev ?? {
    heartRate: 72,
    systolicBP: 120,
    diastolicBP: 80,
    oxygenLevel: 98,
    temperature: 36.8,
  };
  return {
    heartRate: Math.max(45, Math.min(160, fluctuate(base.heartRate, 4))),
    systolicBP: Math.max(80, Math.min(180, fluctuate(base.systolicBP, 3))),
    diastolicBP: Math.max(50, Math.min(110, fluctuate(base.diastolicBP, 2))),
    oxygenLevel: Math.max(88, Math.min(100, fluctuate(base.oxygenLevel, 0.5))),
    temperature: Math.max(34.5, Math.min(40.5, fluctuate(base.temperature, 0.1))),
    timestamp: new Date(),
  };
}

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<BLEDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [vitals, setVitals] = useState<VitalsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const vitalsRef = useRef<VitalsData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSimulator = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startSimulator = useCallback(() => {
    stopSimulator();
    intervalRef.current = setInterval(() => {
      const next = simulateVitals(vitalsRef.current);
      vitalsRef.current = next;
      setVitals(next);
      setLastUpdated(next.timestamp);
    }, 5000);
  }, [stopSimulator]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    await new Promise((r) => setTimeout(r, 1800));
    const mock: BLEDevice = { id: "sim-firebolt-001", name: "Firebolt (Simulated)", connected: true };
    setDevice(mock);
    setIsConnected(true);
    setIsConnecting(false);
    startSimulator();
  }, [startSimulator]);

  const disconnect = useCallback(() => {
    stopSimulator();
    setIsConnected(false);
    setDevice(null);
    vitalsRef.current = null;
  }, [stopSimulator]);

  useEffect(() => () => stopSimulator(), [stopSimulator]);

  return (
    <BLEContext.Provider
      value={{
        device,
        isConnected,
        isConnecting,
        isScanning: false,
        vitals,
        lastUpdated,
        connectionMode: "simulated",
        connect,
        disconnect,
      }}
    >
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
