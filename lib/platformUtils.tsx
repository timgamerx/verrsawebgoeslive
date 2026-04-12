// @ts-nocheck
import { useRouter } from 'next/router';

import { Image } from './reactNativeShim';
export const isWeb = true;
export const isNative = false;
export const isIOS = false;
export const isAndroid = false;

// Web-safe asset resolver
export const resolveAssetSource = (source: any): string => {
  if (isWeb) {
    // On web, return the direct source or a placeholder
    if (typeof source === "string") {
      return source;
    }

    // For require() calls on web, we need to handle differently
    // Since the actual asset path resolution might not work on web,
    // we'll return a placeholder or empty string
    console.log("Asset source on web:", source);

    // Return a placeholder image for now
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTZlNmVmIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNHB4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UG9kY2FzdCBJbWFnZTwvdGV4dD48L3N2Zz4=";
  } else {
    // On native platforms, use the standard resolveAssetSource
    try {
      return Image.resolveAssetSource(source)?.uri || "";
    } catch (error) {
      console.warn("Failed to resolve asset source:", error);
      return "";
    }
  }
};

// Web-safe font fallbacks
export const getFontFamily = (fontName: string): string => {
  if (isWeb) {
    switch (fontName) {
      case "InstrumentSans-Regular":
      case "InstrumentSans-Bold":
        return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      case "Poppins-Regular":
        return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      default:
        return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
  }
  return fontName;
};

// Web-safe styles
export const getWebSafeStyles = (
  webStyles: any = {},
  nativeStyles: any = {}
) => {
  if (isWeb) {
    return { ...nativeStyles, ...webStyles };
  }
  return nativeStyles;
};

// Check if a feature is supported on current platform
export const isFeatureSupported = (feature: string): boolean => {
  const webUnsupportedFeatures = [
    "camera",
    "audio-recording",
    "background-location",
    "push-notifications",
    "haptics",
    "device-motion",
  ];

  if (isWeb && webUnsupportedFeatures.includes(feature)) {
    return false;
  }

  return true;
};

// Safe navigation helper
export const safeNavigate = (navigate: (path: string | number) => void, routeName: string, params?: any) => {
  try {
    navigate(routeName);
  } catch (error) {
    console.warn('Navigation error:', error);
    // Fallback navigation
    try {
      navigate('/home');
    } catch (fallbackError) {
      console.error(`Fallback navigation failed:`, fallbackError);
    }
  }
};

// Web-safe shadow styles
export const getWebSafeShadow = (shadowConfig?: {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}) => {
  if (!shadowConfig) return {};

  if (isWeb) {
    // Convert React Native shadow to CSS boxShadow
    const {
      shadowColor = "#000",
      shadowOffset = { width: 0, height: 2 },
      shadowOpacity = 0.25,
      shadowRadius = 4,
    } = shadowConfig;

    return {
      boxShadow: `${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px rgba(0,0,0,${shadowOpacity})`,
    };
  } else {
    // Return original shadow properties for native
    return shadowConfig;
  }
};
