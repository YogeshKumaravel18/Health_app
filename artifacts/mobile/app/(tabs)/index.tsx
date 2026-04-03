import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useBLE } from "@/context/BLEContext";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { VitalCard } from "@/components/VitalCard";
import { AlertBadge } from "@/components/AlertBadge";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { Feather } from "@expo/vector-icons";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isConnected, vitals, connectionMode, connect } = useBLE();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  // ✅ FETCH VITALS
  const fetchVitals = async () => {
    try {
      const res = await fetch("http://localhost:5000/health-data");
      const data = await res.json();
      setLatestVitals(data?.data || data); // safe handling
    } catch (err) {
      console.log("Vitals error:", err);
    }
  };

  // ✅ FETCH ALERTS
  const fetchAlerts = async () => {
    try {
      const res = await fetch("http://localhost:5000/alerts");
      const data = await res.json();
      setAlerts(data?.data || data || []);
    } catch (err) {
      console.log("Alerts error:", err);
      setAlerts([]);
    }
  };

  // AUTO REFRESH
  useEffect(() => {
    const loadData = async () => {
      await fetchVitals();
      await fetchAlerts();
      setLoading(false);
    };

    loadData();

    const interval = setInterval(() => {
      fetchVitals();
      fetchAlerts();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const activeVitals = vitals || latestVitals;

  // Pulse animation
  useEffect(() => {
    if (!isConnected) return;
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 300, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]);
    const loop = Animated.loop(
      Animated.sequence([pulse, Animated.delay(600)])
    );
    loop.start();
    return () => loop.stop();
  }, [isConnected]);

  const isAbnormal = (field: string) => {
    if (!activeVitals) return false;

    if (field === "heartRate")
      return activeVitals?.heartRate > 120 || activeVitals?.heartRate < 50;

    if (field === "oxygenLevel")
      return activeVitals?.oxygenLevel < 90;

    if (field === "systolicBP")
      return activeVitals?.systolicBP > 140 || activeVitals?.systolicBP < 90;

    if (field === "temperature")
      return activeVitals?.temperature > 38.5 || activeVitals?.temperature < 35;

    return false;
  };

  const hasEmergency = alerts?.some((a) => a?.severity === "emergency");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => {
            fetchVitals();
            fetchAlerts();
          }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Good{" "}
            {new Date().getHours() < 12
              ? "Morning"
              : new Date().getHours() < 17
              ? "Afternoon"
              : "Evening"}
          </Text>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user?.name || "Guest"}
          </Text>
        </View>
      </View>

      {/* Emergency */}
      {hasEmergency && (
        <View style={[styles.emergencyBanner, { backgroundColor: "#dc2626" }]}>
          <Text style={styles.emergencyText}>EMERGENCY MODE ACTIVATED</Text>
        </View>
      )}

      <ConnectionBanner />

      {/* Loading */}
      {loading && (
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          Loading data...
        </Text>
      )}

      {/* Vitals */}
      {!loading && activeVitals ? (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Live Vitals
          </Text>

          <VitalCard
            label="Heart Rate"
            value={Math.round(activeVitals?.heartRate || 0).toString()}
            unit="BPM"
            color={colors.heartRate}
            icon="❤️"
            isAbnormal={isAbnormal("heartRate")}
          />

          <VitalCard
            label="Oxygen"
            value={Math.round(activeVitals?.oxygenLevel || 0).toString()}
            unit="%"
            color={colors.oxygen}
            icon="🫁"
            isAbnormal={isAbnormal("oxygenLevel")}
          />
        </View>
      ) : (
        !loading && (
          <TouchableOpacity onPress={connect}>
            <Text style={{ textAlign: "center", marginTop: 20 }}>
              No data. Connect device
            </Text>
          </TouchableOpacity>
        )
      )}

      {/* Alerts */}
      {alerts?.length > 0 &&
        alerts.map((alert) => (
          <AlertBadge
            key={alert?.id}
            severity={alert?.severity}
            message={alert?.message}
          />
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 13 },
  name: { fontSize: 22 },
  sectionTitle: { fontSize: 16, marginBottom: 10 },
  emergencyBanner: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  emergencyText: { color: "#fff", textAlign: "center" },
});