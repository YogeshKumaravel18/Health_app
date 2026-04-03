import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetProfile, useUpdateProfile } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

type Profile = {
  id: number;
  userId: string;
  name: string;
  email: string;
  role: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  height?: number;
  weight?: number;
  allergies?: string[];
  conditions?: string[];
  emergencyContact?: string;
  emergencyPhone?: string;
  doctorName?: string;
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: profile, refetch } = useGetProfile(
    { userId: user ? String(user.id) : undefined },
    { query: { enabled: !!user } }
  );
  const { mutate: updateProfile } = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [doctorName, setDoctorName] = useState("");

  useEffect(() => {
    if (profile) {
      const p = profile as unknown as Profile;
      setAge(p.age ? String(p.age) : "");
      setGender(p.gender || "");
      setBloodGroup(p.bloodGroup || "");
      setHeight(p.height ? String(p.height) : "");
      setWeight(p.weight ? String(p.weight) : "");
      setEmergencyContact(p.emergencyContact || "");
      setEmergencyPhone(p.emergencyPhone || "");
      setDoctorName(p.doctorName || "");
    }
  }, [profile]);

  function handleSave() {
    if (!user) return;
    updateProfile(
      {
        data: {
          userId: String(user.id),
          age: age ? parseInt(age) : undefined,
          gender: gender || undefined,
          bloodGroup: bloodGroup || undefined,
          height: height ? parseFloat(height) : undefined,
          weight: weight ? parseFloat(weight) : undefined,
          emergencyContact: emergencyContact || undefined,
          emergencyPhone: emergencyPhone || undefined,
          doctorName: doctorName || undefined,
        },
      },
      {
        onSuccess: () => {
          refetch();
          setEditing(false);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: () => Alert.alert("Error", "Failed to save profile"),
      }
    );
  }

  function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  }

  const p = profile as unknown as Profile | null;
  const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
  const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

  function InfoRow({ label, value }: { label: string; value?: string | number }) {
    return (
      <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: value ? colors.foreground : colors.muted }]}>
          {value || "Not set"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 }]}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "?"}</Text>
        </View>
        <Text style={[styles.userName, { color: colors.foreground }]}>{user?.name}</Text>
        <View style={[styles.roleChip, { backgroundColor: colors.secondary }]}>
          <Feather name={user?.role === "doctor" ? "briefcase" : "heart"} size={12} color={colors.primary} />
          <Text style={[styles.roleText, { color: colors.primary }]}>{user?.role}</Text>
        </View>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
      </View>

      {/* Health Info */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Health Information</Text>
          <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)}>
            <Text style={[styles.editBtn, { color: colors.primary }]}>{editing ? "Save" : "Edit"}</Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          <View style={styles.editForm}>
            <EditField label="Age" value={age} setter={setAge} keyboardType="numeric" placeholder="Years" colors={colors} />
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chipBtn, { borderColor: gender === g ? colors.primary : colors.border, backgroundColor: gender === g ? colors.primary + "20" : colors.input }]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.chipBtnText, { color: gender === g ? colors.primary : colors.mutedForeground }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Blood Group</Text>
              <View style={styles.chipRow}>
                {BLOOD_GROUPS.map((bg) => (
                  <TouchableOpacity
                    key={bg}
                    style={[styles.chipBtn, { borderColor: bloodGroup === bg ? colors.primary : colors.border, backgroundColor: bloodGroup === bg ? colors.primary + "20" : colors.input }]}
                    onPress={() => setBloodGroup(bg)}
                  >
                    <Text style={[styles.chipBtnText, { color: bloodGroup === bg ? colors.primary : colors.mutedForeground }]}>{bg}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.twoCol}>
              <View style={styles.colField}>
                <EditField label="Height (cm)" value={height} setter={setHeight} keyboardType="numeric" placeholder="175" colors={colors} />
              </View>
              <View style={styles.colField}>
                <EditField label="Weight (kg)" value={weight} setter={setWeight} keyboardType="numeric" placeholder="70" colors={colors} />
              </View>
            </View>
            <EditField label="Primary Doctor" value={doctorName} setter={setDoctorName} placeholder="Dr. Name" colors={colors} />
            <EditField label="Emergency Contact" value={emergencyContact} setter={setEmergencyContact} placeholder="Name" colors={colors} />
            <EditField label="Emergency Phone" value={emergencyPhone} setter={setEmergencyPhone} keyboardType="phone-pad" placeholder="+1 555..." colors={colors} />
            <TouchableOpacity onPress={() => setEditing(false)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <InfoRow label="Age" value={p?.age ? `${p.age} years` : undefined} />
            <InfoRow label="Gender" value={p?.gender} />
            <InfoRow label="Blood Group" value={p?.bloodGroup} />
            <InfoRow label="Height" value={p?.height ? `${p.height} cm` : undefined} />
            <InfoRow label="Weight" value={p?.weight ? `${p.weight} kg` : undefined} />
            <InfoRow label="Primary Doctor" value={p?.doctorName} />
          </>
        )}
      </View>

      {/* Emergency Contact */}
      {!editing && (
        <View style={[styles.section, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "30" }]}>
          <Text style={[styles.sectionTitle, { color: colors.destructive }]}>Emergency Contact</Text>
          <InfoRow label="Name" value={p?.emergencyContact} />
          <InfoRow label="Phone" value={p?.emergencyPhone} />
        </View>
      )}

      {/* Conditions */}
      {p?.conditions && p.conditions.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Medical Conditions</Text>
          <View style={styles.tagsRow}>
            {p.conditions.map((c, i) => (
              <View key={i} style={[styles.tag, { backgroundColor: colors.warning + "20", borderColor: colors.warning + "40" }]}>
                <Text style={[styles.tagText, { color: colors.warning }]}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Sign Out */}
      <TouchableOpacity
        style={[styles.signOutBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={16} color={colors.destructive} />
        <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function EditField({ label, value, setter, placeholder, keyboardType, colors }: {
  label: string; value: string; setter: (v: string) => void; placeholder?: string; keyboardType?: "numeric" | "phone-pad"; colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
        value={value}
        onChangeText={setter}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType || "default"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff" },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 6 },
  roleChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 6 },
  roleText: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  email: { fontSize: 13, fontFamily: "Inter_400Regular" },
  section: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  editBtn: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontFamily: "Inter_500Medium" },
  editForm: { gap: 4 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chipBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5 },
  chipBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  twoCol: { flexDirection: "row", gap: 12 },
  colField: { flex: 1 },
  cancelBtn: { alignItems: "center", paddingVertical: 10 },
  cancelText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14, borderWidth: 1, marginTop: 8 },
  signOutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
