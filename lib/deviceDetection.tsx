/**
 * Device Detection Utility
 * Detects device type and provides appropriate app store links
 */

export type DeviceType = 'ios' | 'android' | 'desktop' | 'unknown';

export interface AppLinks {
  appStoreUrl: string;
  deepLink: string;
}

/**
 * Detect the device type based on user agent
 */
export const detectDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // iOS detection
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'ios';
  }

  // Android detection
  if (/android/i.test(userAgent)) {
    return 'android';
  }

  // Desktop detection
  if (/(Mac|Windows|Linux)/i.test(userAgent)) {
    return 'desktop';
  }

  return 'unknown';
};

/**
 * Get app store and deep link URLs based on device type
 */
export const getAppLinks = (deviceType: DeviceType): AppLinks => {
  const links: Record<DeviceType, AppLinks> = {
    ios: {
      appStoreUrl: 'https://apps.apple.com/app/id6756518229',
      deepLink: 'verrsa://', // Deep link to open the app if installed
    },
    android: {
      appStoreUrl: 'https://play.google.com/store/apps/details?id=com.verrsa.app',
      deepLink: 'intent://verrsa#Intent;scheme=verrsa;package=com.verrsa.app;end',
    },
    desktop: {
      appStoreUrl: '',
      deepLink: '',
    },
    unknown: {
      appStoreUrl: '',
      deepLink: '',
    },
  };

  return links[deviceType];
};

/**
 * Attempt to open the app via deep link, fallback to app store
 */
export const openApp = (deviceType: DeviceType): void => {
  const { appStoreUrl, deepLink } = getAppLinks(deviceType);

  if (deviceType === 'ios') {
    // Try to open the app via deep link
    window.location.href = deepLink;

    // If app is not installed, redirect to App Store after a delay
    setTimeout(() => {
      window.location.href = appStoreUrl;
    }, 2000);
  } else if (deviceType === 'android') {
    // Android intent will handle both opening app and fallback to Play Store
    window.location.href = deepLink;
  } else {
    // For desktop or unknown, just open the appropriate store if available
    if (appStoreUrl) {
      window.open(appStoreUrl, '_blank');
    }
  }
};

/**
 * Check if device is mobile (iOS or Android)
 */
export const isMobileDevice = (): boolean => {
  const deviceType = detectDeviceType();
  return deviceType === 'ios' || deviceType === 'android';
};
