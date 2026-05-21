/**
 * AppDownloadModal
 * Prompts users to download the mobile app after 30 seconds on the website
 */
import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeProvider";
import { spacing, radius } from "../lib/theme";
import { IoClose, IoPhonePortraitOutline } from "react-icons/io5";
import { detectDeviceType, openApp, isMobileDevice } from "../lib/deviceDetection";
import type { DeviceType } from "../lib/deviceDetection";

interface AppDownloadModalProps {
  visible: boolean;
  onDismiss: () => void;
  onOpenApp: () => void;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  visible,
  onDismiss,
  onOpenApp,
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
    openApp(deviceType);
    onOpenApp();
  };

  const getDeviceName = (): string => {
    if (deviceType === 'ios') return 'iPhone';
    if (deviceType === 'android') return 'Android';
    if (deviceType === 'desktop') return 'device';
    return 'device';
  };

  const getStoreName = (): string => {
    if (deviceType === 'ios') return 'App Store';
    if (deviceType === 'android') return 'Play Store';
    return 'app store';
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

        {/* App Icon */}
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
          <IoPhonePortraitOutline size={40} color="#fff" />
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
          Get the Verrsa App
        </h3>

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
            ? 'Download the Verrsa mobile app for the best experience. Enjoy exclusive features, faster performance, and seamless content creation on the go.'
            : `Experience the best of Verrsa on your ${getDeviceName()}. Enjoy a faster, smoother experience with exclusive mobile features.`
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
            "📱 Optimized mobile experience",
            "🔔 Push notifications",
            "⚡ Faster performance",
            "🎥 Better video playback",
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
            {isDesktopDevice ? 'Download App' : 'Open App'}
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
            : `Opens ${getStoreName()} if app is not installed`
          }
        </p>
      </div>
    </div>
  );
};

export default AppDownloadModal;
