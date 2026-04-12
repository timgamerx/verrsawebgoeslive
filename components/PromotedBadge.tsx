import React from "react";

import { Ionicons, MaterialIcons, StyleSheet, Text, TouchableOpacity, View } from '../lib/reactNativeShim';
interface PromotedBadgeProps {
  style?: any;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  size?: "small" | "medium" | "large";
  callToAction?: "listen_now" | "view_now" | "like_now";
  onCallToActionPress?: () => void;
}

export default function PromotedBadge({
  style,
  textColor = "#00bfff",
  backgroundColor,
  borderColor = "#00bfff",
  borderWidth = 1,
  size = "medium",
  callToAction,
  onCallToActionPress,
}: PromotedBadgeProps) {
  const sizeStyles = {
    small: {
      container: { paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
      text: { fontSize: 10 },
      icon: 14,
      ctaText: { fontSize: 18 },
      ctaIcon: 18,
    },
    medium: {
      container: { paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
      text: { fontSize: 12 },
      icon: 16,
      ctaText: { fontSize: 18 },
      ctaIcon: 18,
    },
    large: {
      container: { paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
      text: { fontSize: 14 },
      icon: 18,
      ctaText: { fontSize: 18 },
      ctaIcon: 18,
    },
  };

  const currentSize = sizeStyles[size];

  // Map call to action to display text and icon
  const getCallToActionContent = () => {
    switch (callToAction) {
      case "listen_now":
        return {
          text: "Listen Now",
          icon: "mic" as const,
          color: "#32CD32",
        };
      case "view_now":
        return {
          text: "View Now",
          icon: "play" as const,
          color: "#FF6347",
        };
      case "like_now":
        return {
          text: "Like",
          icon: "thumbs-up" as const,
          color: "#00BFFF",
        };
      default:
        return null;
    }
  };

  const ctaContent = getCallToActionContent();

  return (
    <View style={[styles.wrapper, style]}>
      {/* Promoted Badge */}
      <View
        style={[
          styles.container,
          currentSize.container,
          {
            borderColor,
            borderWidth,
            backgroundColor: backgroundColor || "transparent",
          },
        ]}
      >
        <MaterialIcons
          name="campaign"
          size={currentSize.icon}
          color={textColor}
          style={styles.icon}
        />
        <Text style={[styles.text, currentSize.text, { color: textColor }]}>
          Promoted
        </Text>
      </View>

      {/* Call to Action Button */}
      {ctaContent && onCallToActionPress && (
        <TouchableOpacity
          style={[
            styles.ctaButton,
            currentSize.container,
            {
              backgroundColor: ctaContent.color,
              marginLeft: 6,
            },
          ]}
          onPress={onCallToActionPress}
          activeOpacity={0.8}
        >
          <Ionicons
            name={ctaContent.icon}
            size={currentSize.ctaIcon}
            color="#fff"
            style={styles.icon}
          />
          <Text style={[styles.ctaText, currentSize.ctaText]}>
            {ctaContent.text}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 40,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ctaText: {
    fontWeight: "600",
    fontSize: 27,
    color: "#fff",
  },
});
