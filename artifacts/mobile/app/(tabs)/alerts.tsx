import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetAlerts, useAcknowledgeAlert } from "@workspace/api-client-react";
import { AlertBadge } from "@/components/AlertBadge";
import { Feather } from "@expo/vector-icons";

type Alert = {
  id: number;
  userId: string;
  alertType: string;
  severity: "warning" | "critical" | "emergency";
  message: string;
  acknowledged: boolean;
  createdAt: string;
};

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data, isLoading, refetch } = useGetAlerts(
    { userId: user ? String(user.id) : undefined },
    { query: { refetchInterval: 15000, enabled: !!user } }
  );
  const { mutate: acknowledgeAlert } = useAcknowledgeAlert();

  const alerts = (data?.data || []) as Alert[];
  const unacknowledged = alerts.filter((a) => !a.acknowledged);
  const acknowledged = alerts.filter((a) => a.acknowledged);

  const emergencyCount = unacknowledged.filter((a) => a.severity === "emergency").length;
  const criticalCount = unacknowledged.filter((a) => a.severity === "critical").length;

  function formatTime(ts: string) {
    return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={[]}
        keyExtractor={() => ""}
        renderItem={null}
        ListHeaderComponent={
          <View style={[styles.content, { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>Alerts</Text>

            {/* Summary Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}>
                <Text style={[styles.statNum, { color: colors.destructive }]}>{emergencyCount}</Text>
                <Text style={[styles.statLabel, { color: colors.destructive }]}>Emergency</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
                <Text style={[styles.statNum, { color: colors.warning }]}>{criticalCount}</Text>
                <Text style={[styles.statLabel, { color: colors.warning }]}>Critical</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
                <Text style={[styles.statNum, { color: colors.success }]}>{acknowledged.length}</Text>
                <Text style={[styles.statLabel, { color: colors.success }]}>Resolved</Text>
              </View>
            </View>

            {/* Active Alerts */}
            {unacknowledged.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active Alerts</Text>
                {unacknowledged.map((alert) => (
                  <View key={alert.id}>
                    <AlertBadge
                      severity={alert.severity}
                      message={alert.message}
                      onAcknowledge={() => acknowledgeAlert({ id: alert.id })}
                    />
                    <Text style={[styles.alertTime, { color: colors.mutedForeground }]}>{formatTime(alert.createdAt)}</Text>
                  </View>
                ))}
              </>
            )}

            {/* Resolved Alerts */}
            {acknowledged.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Resolved</Text>
                {acknowledged.slice(0, 10).map((alert) => (
                  <View key={alert.id} style={[styles.resolvedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.resolvedRow}>
                      <Feather name="check-circle" size={14} color={colors.success} />
                      <View style={styles.resolvedText}>
                        <Text style={[styles.resolvedMsg, { color: colors.mutedForeground }]} numberOfLines={2}>{alert.message}</Text>
                        <Text style={[styles.resolvedTime, { color: colors.muted }]}>{formatTime(alert.createdAt)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}

            {alerts.length === 0 && !isLoading && (
              <View style={styles.empty}>
                <Feather name="shield" size={40} color={colors.success} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All Clear</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  No alerts detected. Your vitals look healthy!
                </Text>
              </View>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1 },
  statNum: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 10, marginTop: 4 },
  alertTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: -4, marginBottom: 10, marginLeft: 4 },
  resolvedCard: { borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1 },
  resolvedRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  resolvedText: { flex: 1 },
  resolvedMsg: { fontSize: 12, fontFamily: "Inter_400Regular" },
  resolvedTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
