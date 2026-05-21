/**
 * PodcastAppPromptModal
 * Prompts users to open the app to listen to podcasts with deep linking support
 */
import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeProvider";
import { spacing, radius } from "../lib/theme";
import { IoClose, IoHeadset } from "react-icons/io5";
import { detectDeviceType, isMobileDevice } from "../lib/deviceDetection";
import type { DeviceType } from "../lib/deviceDetection";

interface PodcastAppPromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  podcastId?: string;
  podcastTitle?: string;
}

export const PodcastAppPromptModal: React.FC<PodcastAppPromptModalProps> = ({
  visible,
  onDismiss,
  podcastId,
  podcastTitle,
}) => {
  const { theme } = useTheme();
  const [opacity, setOpacity] = useState(0);
  const [translateY, setTranslateY] = useState(80);
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Detect device type on mount
    setDeviceType(detectDeviceType());
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (visible) {
      // Next tick so transition fires after display:flex
      timerRef.current = setTimeout(() => {
        setOpacity(1);
        setTranslateY(0);
      }, 10);
    } else {
      setOpacity(0);
      setTranslateY(80);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  const handleOpenApp = () => {
    // Deep link to specific podcast if podcastId is provided
    const deepLink = podcastId 
      ? `verrsa://podcast/${podcastId}`
      : 'verrsa://podcasts';
    
    // Try to open the app with deep link
    if (deviceType === 'ios') {
      // iOS deep linking
      window.location.href = deepLink;
      // Fallback to App Store after a delay if app is not installed
      setTimeout(() => {
        window.location.href = 'https://apps.apple.com/us/app/verrsa/id6756518229'; // Replace with actual App Store URL
      }, 2000);
    } else if (deviceType === 'android') {
      // Android deep linking
      window.location.href = deepLink;
      // Fallback to Play Store after a delay if app is not installed
      setTimeout(() => {
        window.location.href = 'https://play.google.com/store/apps/details?id=com.verrsaapp.verrsa'; // Replace with actual Play Store URL
      }, 2000);
    } else {
      // Desktop - show download options
      window.open('https://www.verrsa.org', '_blank');
    }
    
    onDismiss();
  };

  const getDeviceName = (): string => {
    if (deviceType === 'ios') return 'iPhone';
    if (deviceType === 'android') return 'Android';
    return 'device';
  };

  const isDesktopDevice = deviceType === 'desktop';

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 1000,
        opacity,
        transition: "opacity 280ms ease",
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: theme.cardBackground,
          borderTopLeftRadius: `${radius.xl2}px`,
          borderTopRightRadius: `${radius.xl2}px`,
          paddingTop: `${spacing.xl}px`,
          paddingLeft: `${spacing.xl}px`,
          paddingRight: `${spacing.xl}px`,
          paddingBottom: `${spacing.xl}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          transform: `translateY(${translateY}px)`,
          transition: "transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          fontFamily: "'Instrument Sans', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          style={{
            position: "absolute",
            top: `${spacing.base}px`,
            right: `${spacing.base}px`,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: `${spacing.xs}px`,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Close"
        >
          <IoClose size={22} color={theme.secondaryText} />
        </button>

        {/* Podcast Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: `${radius.xl}px`,
            backgroundColor: theme.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: `${spacing.base}px`,
          }}
        >
          <IoHeadset size={40} color="#fff" />
        </div>

        {/* Title */}
        <h3
          style={{
            margin: `0 0 ${spacing.xs}px`,
            fontSize: 20,
            fontWeight: "700",
            color: theme.text,
            textAlign: "center",
          }}
        >
          Listen in the Verrsa App
        </h3>

        {/* Podcast Title if provided */}
        {podcastTitle && (
          <p
            style={{
              margin: `0 0 ${spacing.sm}px`,
              fontSize: 15,
              color: theme.text,
              textAlign: "center",
              fontWeight: "500",
              padding: `0 ${spacing.sm}px`,
            }}
          >
            "{podcastTitle}"
          </p>
        )}

        {/* Description */}
        <p
          style={{
            margin: `0 0 ${spacing.base}px`,
            fontSize: 14,
            color: theme.secondaryText,
            textAlign: "center",
            lineHeight: "1.5",
            padding: `0 ${spacing.sm}px`,
          }}
        >
          {isDesktopDevice
            ? 'Download the Verrsa mobile app to enjoy podcasts with better audio quality, offline listening, and background playback.'
            : `Get the best podcast listening experience on your ${getDeviceName()} with background playback, offline downloads, and more.`
          }
        </p>

        {/* Features List */}
        <div
          style={{
            width: "100%",
            marginBottom: `${spacing.xl}px`,
            display: "flex",
            flexDirection: "column",
            gap: `${spacing.sm}px`,
          }}
        >
          {[
            "🎧 High-quality audio playback",
            "📥 Download for offline listening",
            "🔄 Background playback support",
            "⏩ Speed controls & sleep timer",
          ].map((feature, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 13,
                color: theme.text,
                padding: `${spacing.xs}px 0`,
              }}
            >
              <span style={{ marginRight: `${spacing.sm}px` }}>
                {feature.split(" ")[0]}
              </span>
              <span>{feature.substring(feature.indexOf(" ") + 1)}</span>
            </div>
          ))}
        </div>

        {/* Open App button */}
        <button
          onClick={handleOpenApp}
          style={{
            width: "100%",
            height: 50,
            borderRadius: `${radius.lg}px`,
            backgroundColor: theme.accent,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: `${spacing.sm}px`,
            fontFamily: "'Instrument Sans', sans-serif",
          }}
        >
          <span style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
            {isDesktopDevice ? 'Download App' : 'Open in App'}
          </span>
        </button>

        {/* Continue in Browser */}
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: `${spacing.sm}px`,
            color: theme.secondaryText,
            fontSize: 13,
            fontFamily: "'Instrument Sans', sans-serif",
          }}
        >
          Continue in Browser
        </button>

        {/* Small text */}
        <p
          style={{
            margin: `${spacing.sm}px 0 0`,
            fontSize: 11,
            color: theme.secondaryText,
            textAlign: "center",
            opacity: 0.7,
          }}
        >
          {isDesktopDevice
            ? 'Available on iOS and Android'
            : 'Opens app store if Verrsa is not installed'
          }
        </p>
      </div>
    </div>
  );
};

export default PodcastAppPromptModal;
