import React from "react";

import { MaterialIcons, Modal, StyleSheet, Text, TouchableOpacity, View } from '../lib/reactNativeShim';
import { useTheme } from '../context/ThemeProvider';
interface NotificationPromptModalProps {
  visible: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

const NotificationPromptModal: React.FC<NotificationPromptModalProps> = ({
  visible,
  onAllow,
  onDismiss,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.cardBackground },
          ]}
        >
          {/* Icon */}
          <View
            style={{...(styles.iconContainer || {}), backgroundColor: theme.accent}}
          >
            <MaterialIcons name="notifications-active" size={40} color="#fff" />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>
            Stay Updated!
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: theme.secondaryText }]}>
            Get notified about new posts, comments, likes, and updates from
            creators you follow. Never miss what matters to you!
          </Text>

          {/* Benefits List */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <MaterialIcons
                name="check-circle"
                size={20}
                color={theme.accent}
              />
              <Text style={[styles.benefitText, { color: theme.text }]}>
                New content from creators you follow
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialIcons
                name="check-circle"
                size={20}
                color={theme.accent}
              />
              <Text style={[styles.benefitText, { color: theme.text }]}>
                Likes and comments on your posts
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialIcons
                name="check-circle"
                size={20}
                color={theme.accent}
              />
              <Text style={[styles.benefitText, { color: theme.text }]}>
                Live stream announcements
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={{...(styles.allowButton || {}), backgroundColor: theme.accent}}
            onPress={onAllow}
          >
            <Text style={styles.allowButtonText}>Turn On Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={[styles.dismissButtonText, { color: theme.text }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 20,
  },
  benefitsList: {
    width: "100%",
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    flex: 1,
  },
  allowButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  allowButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dismissButton: {
    paddingVertical: 10,
  },
  dismissButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
});

export default NotificationPromptModal;
