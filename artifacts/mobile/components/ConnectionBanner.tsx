import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useBLE } from "@/context/BLEContext";
import { useColors } from "@/hooks/useColors";

export function ConnectionBanner() {
  const colors = useColors();
  const { isConnected, isConnecting, isScanning, device, connectionMode, connect, disconnect, lastUpdated } = useBLE();

  const statusColor = isConnected
    ? connectionMode === "real" ? colors.success : colors.warning
    : colors.mutedForeground;

  const bgColor = isConnected
    ? connectionMode === "real" ? colors.success + "15" : colors.warning + "15"
    : colors.muted + "40";

  const borderColor = isConnected
    ? connectionMode === "real" ? colors.success + "40" : colors.warning + "40"
    : colors.border;

  let statusText = "Not Connected";
  if (isScanning) statusText = "Scanning for Firebolt…";
  else if (isConnecting) statusText = "Connecting…";
  else if (isConnected) statusText = connectionMode === "real" ? "Firebolt Connected" : "Simulator Active";

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.left}>
        {(isConnecting || isScanning) ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.indicator} />
        ) : (
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
        )}
        <View>
          <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
          {device && isConnected ? (
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              {device.name}
            </Text>
          ) : null}
          {isConnected && lastUpdated ? (
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Synced {lastUpdated.toLocaleTimeString()}
            </Text>
          ) : !isConnected && !isConnecting && !isScanning ? (
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Tap to scan for your watch
            </Text>
          ) : null}
        </View>
      </View>

      {!isConnecting && !isScanning ? (
        <TouchableOpacity
          onPress={isConnected ? disconnect : connect}
          style={[styles.btn, { backgroundColor: isConnected ? colors.muted : colors.primary }]}
        >
          <Feather
            name={isConnected ? "bluetooth-off" : "bluetooth"}
            size={14}
            color={isConnected ? colors.foreground : colors.primaryForeground}
          />
          <Text style={[styles.btnText, { color: isConnected ? colors.foreground : colors.primaryForeground }]}>
            {isConnected ? "Disconnect" : "Connect Watch"}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => {
            /* allow cancelling scan */ disconnect();
          }}
          style={[styles.btn, { backgroundColor: colors.muted }]}
        >
          <Text style={[styles.btnText, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  indicator: {
    width: 14,
    height: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  status: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  sub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexShrink: 0,
  },
  btnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
