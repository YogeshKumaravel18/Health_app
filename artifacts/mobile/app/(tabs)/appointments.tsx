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
import { useGetAppointments, useCreateAppointment, useDeleteAppointment } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

type Appointment = {
  id: number;
  patientId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
};

const SPECIALTIES = ["General Physician", "Cardiologist", "Pulmonologist", "Endocrinologist", "Neurologist", "Orthopedist"];

export default function AppointmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data, isLoading, refetch } = useGetAppointments(
    { userId: user ? String(user.id) : undefined },
    { query: { enabled: !!user } }
  );
  const { mutate: createAppointment } = useCreateAppointment();
  const { mutate: deleteAppointment } = useDeleteAppointment();

  const [showModal, setShowModal] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const appointments = ((data?.data || []) as Appointment[]).sort(
    (a, b) => new Date(a.date + "T" + a.time).getTime() - new Date(b.date + "T" + b.time).getTime()
  );
  const upcoming = appointments.filter((a) => a.status === "scheduled");
  const past = appointments.filter((a) => a.status !== "scheduled");

  async function handleCreate() {
    if (!doctorName || !date || !time) {
      Alert.alert("Error", "Please fill in doctor name, date and time");
      return;
    }
    setSaving(true);
    createAppointment(
      { data: { patientId: String(user!.id), doctorName, specialty, date, time, notes } },
      {
        onSuccess: () => {
          refetch();
          setShowModal(false);
          setDoctorName(""); setDate(""); setTime(""); setNotes("");
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSaving(false);
        },
        onError: () => { setSaving(false); Alert.alert("Error", "Failed to book appointment"); },
      }
    );
  }

  function handleCancel(id: number) {
    Alert.alert("Cancel Appointment", "Cancel this appointment?", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: () => deleteAppointment({ id }, { onSuccess: () => refetch() }),
      },
    ]);
  }

  function isUpcoming(appt: Appointment) {
    const apptDate = new Date(appt.date + "T" + appt.time);
    return apptDate > new Date();
  }

  const renderItem = ({ item }: { item: Appointment }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="calendar" size={20} color={colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.doctorName, { color: colors.foreground }]}>Dr. {item.doctorName}</Text>
          <Text style={[styles.specialty, { color: colors.mutedForeground }]}>{item.specialty}</Text>
        </View>
        {item.status === "scheduled" && (
          <TouchableOpacity onPress={() => handleCancel(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={18} color={colors.destructive} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.dateRow}>
        <View style={[styles.dateBadge, { backgroundColor: colors.secondary }]}>
          <Feather name="calendar" size={12} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.primary }]}>{item.date}</Text>
        </View>
        <View style={[styles.dateBadge, { backgroundColor: colors.secondary }]}>
          <Feather name="clock" size={12} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.primary }]}>{item.time}</Text>
        </View>
        <View style={[styles.statusBadge, {
          backgroundColor: item.status === "scheduled" ? colors.success + "20" : colors.muted,
        }]}>
          <Text style={[styles.statusText, {
            color: item.status === "scheduled" ? colors.success : colors.mutedForeground,
          }]}>{item.status}</Text>
        </View>
      </View>
      {item.notes ? <Text style={[styles.notes, { color: colors.mutedForeground }]}>{item.notes}</Text> : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={[...upcoming, ...past]}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Appointments</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{upcoming.length} upcoming</Text>
            {upcoming.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Upcoming</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Feather name="calendar" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Appointments</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Book your first appointment</Text>
            </View>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        scrollEnabled={appointments.length > 0}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad + 90 }]}
        onPress={() => setShowModal(true)}
      >
        <Feather name="plus" size={24} color={colors.primaryForeground} />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={[styles.modal, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Book Appointment</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              <Text style={[styles.saveBtn, { color: saving ? colors.mutedForeground : colors.primary }]}>Book</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Doctor Name *</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={doctorName}
                onChangeText={setDoctorName}
                placeholder="e.g. Smith"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Specialty *</Text>
              <View style={styles.specGrid}>
                {SPECIALTIES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.specBtn, { borderColor: specialty === s ? colors.primary : colors.border, backgroundColor: specialty === s ? colors.primary + "20" : colors.input }]}
                    onPress={() => setSpecialty(s)}
                  >
                    <Text style={[styles.specText, { color: specialty === s ? colors.primary : colors.mutedForeground }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={date}
                onChangeText={setDate}
                placeholder="2025-06-15"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Time * (HH:MM)</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={time}
                onChangeText={setTime}
                placeholder="10:30"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notes</Text>
              <TextInput
                style={[styles.fieldInput, styles.notesInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Reason for visit..."
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
  header: { marginBottom: 8 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2, marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  card: { borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  doctorName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  specialty: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  dateRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dateBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dateText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
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
  specGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  specBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5 },
  specText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
