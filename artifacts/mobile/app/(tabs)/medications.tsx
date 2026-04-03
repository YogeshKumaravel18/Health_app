import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetMedications, useCreateMedication, useDeleteMedication } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

type Medication = {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  notes?: string;
  active: boolean;
};

const TIMES_OPTIONS = ["06:00", "08:00", "12:00", "14:00", "18:00", "20:00", "22:00"];

export default function MedicationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data, isLoading, refetch } = useGetMedications(
    { userId: user ? String(user.id) : undefined },
    { query: { enabled: !!user } }
  );
  const { mutate: createMedication } = useCreateMedication();
  const { mutate: deleteMedication } = useDeleteMedication();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const medications = (data?.data || []) as Medication[];

  function toggleTime(t: string) {
    setSelectedTimes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  async function handleCreate() {
    if (!name || !dosage || !frequency || selectedTimes.length === 0) {
      Alert.alert("Error", "Please fill in all required fields and select at least one time");
      return;
    }
    setSaving(true);
    createMedication(
      { data: { userId: String(user!.id), name, dosage, frequency, times: selectedTimes, notes } },
      {
        onSuccess: () => {
          refetch();
          setShowModal(false);
          setName(""); setDosage(""); setFrequency(""); setSelectedTimes([]); setNotes("");
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSaving(false);
        },
        onError: () => { setSaving(false); Alert.alert("Error", "Failed to save medication"); },
      }
    );
  }

  function handleDelete(id: number) {
    Alert.alert("Delete Medication", "Remove this medication reminder?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMedication({ id }, { onSuccess: () => refetch() }),
      },
    ]);
  }

  function isCurrentReminder(med: Medication) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    return med.times.some((t) => {
      const [h, m] = t.split(":").map(Number);
      return Math.abs((h || 0) * 60 + (m || 0) - currentHour * 60 - currentMin) <= 30;
    });
  }

  const renderItem = ({ item }: { item: Medication }) => {
    const dueSoon = isCurrentReminder(item);
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: dueSoon ? colors.warning : colors.border }]}>
        {dueSoon && (
          <View style={[styles.dueBadge, { backgroundColor: colors.warning }]}>
            <Text style={styles.dueText}>DUE SOON</Text>
          </View>
        )}
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="package" size={20} color={colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.medName, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.dosageText, { color: colors.mutedForeground }]}>{item.dosage} · {item.frequency}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
        <View style={styles.timesRow}>
          {(item.times || []).map((t) => (
            <View key={t} style={[styles.timeChip, { backgroundColor: colors.secondary }]}>
              <Feather name="clock" size={10} color={colors.primary} />
              <Text style={[styles.timeText, { color: colors.primary }]}>{t}</Text>
            </View>
          ))}
        </View>
        {item.notes ? <Text style={[styles.notes, { color: colors.mutedForeground }]}>{item.notes}</Text> : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={medications}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Medications</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{medications.length} active reminders</Text>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Feather name="package" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Medications</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Add your first medication reminder</Text>
            </View>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        scrollEnabled={medications.length > 0}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad + 90 }]}
        onPress={() => setShowModal(true)}
      >
        <Feather name="plus" size={24} color={colors.primaryForeground} />
      </TouchableOpacity>

      {/* Add Medication Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={[styles.modal, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Medication</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              <Text style={[styles.saveBtn, { color: saving ? colors.mutedForeground : colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {[
              { label: "Medication Name *", value: name, setter: setName, placeholder: "e.g. Metformin" },
              { label: "Dosage *", value: dosage, setter: setDosage, placeholder: "e.g. 500mg" },
              { label: "Frequency *", value: frequency, setter: setFrequency, placeholder: "e.g. Twice daily" },
            ].map(({ label, value, setter, placeholder }) => (
              <View key={label} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={value}
                  onChangeText={setter}
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Reminder Times *</Text>
              <View style={styles.timesGrid}>
                {TIMES_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.timeOption,
                      { borderColor: selectedTimes.includes(t) ? colors.primary : colors.border, backgroundColor: selectedTimes.includes(t) ? colors.primary + "20" : colors.input },
                    ]}
                    onPress={() => toggleTime(t)}
                  >
                    <Text style={[styles.timeOptionText, { color: selectedTimes.includes(t) ? colors.primary : colors.mutedForeground }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notes</Text>
              <TextInput
                style={[styles.fieldInput, styles.notesInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Special instructions..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  card: { borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 },
  dueBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginBottom: 8 },
  dueText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  medName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  dosageText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  timesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  timeChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  timeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  notes: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 8, fontStyle: "italic" },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveBtn: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalContent: { padding: 16 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  notesInput: { height: 80, textAlignVertical: "top" },
  timesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  timeOptionText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
