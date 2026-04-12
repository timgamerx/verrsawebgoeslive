import React, { useState, useRef, useEffect } from "react";
import { ActivityIndicator, Animated, Ionicons, KeyboardAvoidingView, MaterialIcons, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from '../lib/reactNativeShim';
import { useTheme } from "../context/ThemeProvider";
import { spacing, radius } from "../lib/theme";

interface FeedbackPromptModalProps {
  visible: boolean;
  onSubmit: (rating: number, message: string) => Promise<void>;
  onDismiss: () => void;
}

const STAR_COUNT = 5;

const FeedbackPromptModal: React.FC<FeedbackPromptModalProps> = ({
  visible,
  onSubmit,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRating(0);
      setMessage("");
      setSubmitting(false);
      setSubmitted(false);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    await onSubmit(rating, message);
    setSubmitting(false);
    setSubmitted(true);
    // Auto-close after showing success state
    setTimeout(onDismiss, 1800);
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.cardBackground, transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          {submitted ? (
            // Success state
            <View style={styles.successContainer}>
              <View style={{...(styles.iconCircle || {}), backgroundColor: "#22c55e22"}}>
                <Ionicons name="checkmark-circle" size={52} color="#22c55e" />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                Thank you! 🎉
              </Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                Your feedback means the world to us.
              </Text>
            </View>
          ) : (
            // Input state
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* Header */}
              <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
                <Ionicons name="close" size={22} color={theme.secondaryText} />
              </TouchableOpacity>

              <View style={[styles.iconCircle, { backgroundColor: theme.accent + "22" }]}>
                <MaterialIcons name="rate-review" size={40} color={theme.accent} />
              </View>

              <Text style={[styles.title, { color: theme.text }]}>
                How's your experience?
              </Text>
              <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                You've been with us for a while — we'd love to hear your thoughts!
              </Text>

              {/* Star rating */}
              <View style={styles.starsRow}>
                {Array.from({ length: STAR_COUNT }, (_, i) => i + 1).map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={star <= rating ? "star" : "star-outline"}
                      size={36}
                      color={star <= rating ? "#f59e0b" : theme.secondaryText}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {rating > 0 && (
                <Text style={[styles.ratingLabel, { color: theme.accent }]}>
                  {ratingLabels[rating]}
                </Text>
              )}

              {/* Message input */}
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.background,
                    borderColor: theme.border || theme.secondaryText + "40",
                  },
                ]}
                placeholder="Share your experience or testimonial (optional)"
                placeholderTextColor={theme.secondaryText}
                multiline
                numberOfLines={4}
                maxLength={500}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
              />

              <Text style={[styles.charCount, { color: theme.secondaryText }]}>
                {message.length}/500
              </Text>

              {/* Submit */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: rating > 0 ? theme.accent : theme.secondaryText + "44",
                  },
                ]}
                onPress={handleSubmit}
                disabled={rating === 0 || submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitText}>Submit Feedback</Text>
                )}
              </TouchableOpacity>

              {/* Dismiss */}
              <TouchableOpacity style={styles.laterButton} onPress={onDismiss}>
                <Text style={[styles.laterText, { color: theme.secondaryText }]}>
                  Maybe Later
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: radius.xl,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 14,
  },
  scrollContent: {
    alignItems: "center",
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 4,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
    gap: 6,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  textInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 4,
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 12,
    marginBottom: spacing.lg,
  },
  submitButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  submitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  laterButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  laterText: {
    fontSize: 14,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
});

export default FeedbackPromptModal;
