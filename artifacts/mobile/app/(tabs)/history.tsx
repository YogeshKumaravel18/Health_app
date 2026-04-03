import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetVitals } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";

type VitalsRecord = {
  id: number;
  userId: string;
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  oxygenLevel: number;
  temperature: number;
  isAbnormal: boolean;
  abnormalReasons: string[];
  timestamp: string;
};

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data, isLoading, refetch } = useGetVitals(
    { userId: user ? String(user.id) : undefined, limit: pageSize, offset: page * pageSize },
    { query: { refetchInterval: 30000, enabled: !!user } }
  );

  const records = (data?.data || []) as VitalsRecord[];

  function getStatusColor(record: VitalsRecord) {
    if (!record.isAbnormal) return colors.success;
    return colors.destructive;
  }

  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const renderItem = ({ item }: { item: VitalsRecord }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: item.isAbnormal ? colors.destructive + "50" : colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item) }]} />
        <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatTime(item.timestamp)}</Text>
        {item.isAbnormal && (
          <View style={[styles.abnormalTag, { backgroundColor: colors.destructive + "20" }]}>
            <Text style={[styles.abnormalTagText, { color: colors.destructive }]}>Abnormal</Text>
          </View>
        )}
      </View>
      <View style={styles.vitalsRow}>
        <MetricChip icon="❤️" value={`${Math.round(item.heartRate)}`} unit="BPM" color={colors.heartRate} />
        <MetricChip icon="🫁" value={`${Math.round(item.oxygenLevel)}%`} unit="SpO₂" color={colors.oxygen} />
        <MetricChip icon="🩺" value={`${Math.round(item.systolicBP)}/${Math.round(item.diastolicBP)}`} unit="BP" color={colors.bloodPressure} />
        <MetricChip icon="🌡️" value={`${item.temperature.toFixed(1)}°`} unit="Temp" color={colors.temperature} />
      </View>
      {item.isAbnormal && item.abnormalReasons?.length > 0 && (
        <View style={[styles.reasonsWrap, { backgroundColor: colors.destructive + "10" }]}>
          {item.abnormalReasons.map((r, i) => (
            <View key={i} style={styles.reasonRow}>
              <Feather name="alert-circle" size={11} color={colors.destructive} />
              <Text style={[styles.reasonText, { color: colors.destructive }]}>{r}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={records}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Health History</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {data?.total || 0} readings recorded
            </Text>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Feather name="clock" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No history yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Connect your device to start recording
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
        scrollEnabled={records.length > 0}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function MetricChip({ icon, value, unit, color }: { icon: string; value: string; unit: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.chip, { backgroundColor: color + "15" }]}>
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={[styles.chipUnit, { color: colors.mutedForeground }]}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  card: { borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  time: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  abnormalTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  abnormalTagText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  vitalsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  chipIcon: { fontSize: 12 },
  chipValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  chipUnit: { fontSize: 10, fontFamily: "Inter_400Regular" },
  reasonsWrap: { marginTop: 8, padding: 8, borderRadius: 8, gap: 3 },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  reasonText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
