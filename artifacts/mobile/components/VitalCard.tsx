import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface VitalCardProps {
  label: string;
  value: string;
  unit: string;
  color: string;
  icon: string;
  isAbnormal?: boolean;
  subtitle?: string;
}

export function VitalCard({ label, value, unit, color, icon, isAbnormal, subtitle }: VitalCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: isAbnormal ? colors.destructive : colors.border }]}>
      {isAbnormal && (
        <View style={[styles.abnormalBadge, { backgroundColor: colors.destructive }]}>
          <Text style={styles.abnormalText}>!</Text>
        </View>
      )}
      <View style={[styles.iconCircle, { backgroundColor: color + "20" }]}>
        <Text style={[styles.iconText, { color }]}>{icon}</Text>
      </View>
      <Text style={[styles.value, { color: isAbnormal ? colors.destructive : colors.foreground }]}>{value}</Text>
      <Text style={[styles.unit, { color: colors.mutedForeground }]}>{unit}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    flex: 1,
    minWidth: 140,
    position: "relative",
  },
  abnormalBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  abnormalText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconText: {
    fontSize: 22,
  },
  value: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 34,
  },
  unit: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
