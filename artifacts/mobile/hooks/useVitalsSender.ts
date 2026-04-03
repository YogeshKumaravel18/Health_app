import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useBLE } from "@/context/BLEContext";

/**
 * Wires up the BLE vitals stream to the backend API.
 * Call this hook once at the root level (e.g., in _layout.tsx or a top-level screen).
 */
export function useVitalsSender() {
  const { user, token } = useAuth();
  const { isConnected, vitals } = useBLE();
  const sentRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!isConnected || !vitals || !user || !token) return;

    // Debounce — only send if it's a new reading
    if (sentRef.current && vitals.timestamp <= sentRef.current) return;
    sentRef.current = vitals.timestamp;

    const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
    fetch(`${BASE_URL}/api/vitals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        userId: String(user.id),
        deviceId: "simulated-ble-001",
        heartRate: vitals.heartRate,
        systolicBP: vitals.systolicBP,
        diastolicBP: vitals.diastolicBP,
        oxygenLevel: vitals.oxygenLevel,
        temperature: vitals.temperature,
        timestamp: vitals.timestamp.toISOString(),
      }),
    }).catch(() => {});
  }, [vitals, isConnected, user, token]);
}
