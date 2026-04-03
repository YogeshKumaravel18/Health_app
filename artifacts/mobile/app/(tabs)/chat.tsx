import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { KeyboardAvoidingView as KAV } from "react-native-keyboard-controller";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetChatMessages, useSendMessage } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

type Message = {
  id: number;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
};

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const roomId = `room-${user?.id || "general"}`;

  const { data, refetch } = useGetChatMessages(
    { roomId, limit: 100 },
    { query: { refetchInterval: 5000, enabled: !!user } }
  );
  const { mutate: sendMessage } = useSendMessage();

  const messages = (data?.data || []) as Message[];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  function handleSend() {
    if (!messageText.trim() || !user) return;
    const content = messageText.trim();
    setMessageText("");
    sendMessage(
      { data: { roomId, senderId: String(user.id), senderName: user.name, senderRole: user.role, content } },
      {
        onSuccess: () => {
          refetch();
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }
    );
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === String(user?.id);
    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <View style={[styles.avatar, { backgroundColor: colors.primary + "30" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {item.senderName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.messageBubbleWrap}>
          {!isMe && (
            <View style={styles.senderInfo}>
              <Text style={[styles.senderName, { color: colors.mutedForeground }]}>{item.senderName}</Text>
              <View style={[styles.roleTag, { backgroundColor: item.senderRole === "doctor" ? colors.primary + "20" : colors.secondary }]}>
                <Text style={[styles.roleTagText, { color: item.senderRole === "doctor" ? colors.primary : colors.mutedForeground }]}>
                  {item.senderRole}
                </Text>
              </View>
            </View>
          )}
          <View style={[
            styles.bubble,
            {
              backgroundColor: isMe ? colors.primary : colors.card,
              borderColor: isMe ? "transparent" : colors.border,
            }
          ]}>
            <Text style={[styles.messageText, { color: isMe ? colors.primaryForeground : colors.foreground }]}>
              {item.content}
            </Text>
          </View>
          <Text style={[styles.messageTime, { color: colors.mutedForeground }, isMe && styles.messageTimeMe]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Doctor-Patient Chat</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Secure messaging</Text>
        </View>
      </View>

      <KAV style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messagesList, { paddingBottom: 16 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Start the conversation with your doctor
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad + 8 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: messageText.trim() ? colors.primary : colors.muted }]}
            onPress={handleSend}
            disabled={!messageText.trim()}
          >
            <Feather name="send" size={18} color={messageText.trim() ? colors.primaryForeground : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </KAV>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  messagesList: { paddingHorizontal: 16, paddingTop: 16 },
  messageRow: { flexDirection: "row", marginBottom: 16, alignItems: "flex-end", gap: 8 },
  messageRowMe: { flexDirection: "row-reverse" },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  messageBubbleWrap: { maxWidth: "75%" },
  senderInfo: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  senderName: { fontSize: 11, fontFamily: "Inter_500Medium" },
  roleTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  roleTagText: { fontSize: 9, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  messageText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  messageTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3 },
  messageTimeMe: { textAlign: "right" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, gap: 10 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
