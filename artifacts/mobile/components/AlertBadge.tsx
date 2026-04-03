import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

interface AlertBadgeProps {
  severity: "warning" | "critical" | "emergency";
  message: string;
  onAcknowledge?: () => void;
  compact?: boolean;
}

export function AlertBadge({ severity, message, onAcknowledge, compact }: AlertBadgeProps) {
  const colors = useColors();

  const severityColors: Record<string, string> = {
    warning: colors.warning,
    critical: colors.destructive,
    emergency: "#dc2626",
  };

  const bgColors: Record<string, string> = {
    warning: colors.warning + "20",
    critical: colors.destructive + "20",
    emergency: "#dc262620",
  };

  const icons: Record<string, "alert-triangle" | "alert-octagon" | "zap"> = {
    warning: "alert-triangle",
    critical: "alert-octagon",
    emergency: "zap",
  };

  const color = severityColors[severity] || colors.warning;
  const bg = bgColors[severity] || colors.warning + "20";
  const icon = icons[severity] || "alert-triangle";

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: bg, borderColor: color + "40" }]}>
        <Feather name={icon} size={12} color={color} />
        <Text style={[styles.compactText, { color }]} numberOfLines={1}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: color + "40" }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Feather name={icon} size={18} color={color} />
          <View style={styles.textWrap}>
            <Text style={[styles.severity, { color }]}>{severity.toUpperCase()}</Text>
            <Text style={[styles.message, { color: colors.foreground }]}>{message}</Text>
          </View>
        </View>
        {onAcknowledge ? (
          <TouchableOpacity onPress={onAcknowledge} style={[styles.ackBtn, { borderColor: color }]}>
            <Text style={[styles.ackText, { color }]}>OK</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  textWrap: {
    flex: 1,
  },
  severity: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  message: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  ackBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  ackText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  compactText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
});
