'use client';

// @ts-nocheck
// Device tracking utility
import { supabase } from "../components/supabase";

import { Platform } from './reactNativeShim';
const API_BASE_URL = "https://www.verrsa.org/api";

export interface DeviceInfo {
  device_id: string;
  device_type: string;
  browser?: string;
  ip_address: string;
  location?: string;
  first_seen: string;
  last_active: string;
  is_current: boolean;
}

/**
 * Get client IP address and device info from server
 */
export const getClientInfo = async (): Promise<{
  ipAddress: string;
  deviceType: string;
  browser?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/get-client-info`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to get client info");
    }

    return {
      ipAddress: data.ipAddress || "Unknown",
      deviceType: data.deviceType || "Unknown",
      browser: data.browser,
    };
  } catch (error) {
    console.error("Error getting client info:", error);
    // Return fallback values
    return {
      ipAddress: "Unknown",
      deviceType:
        true ? "Web Browser" : `${Platform.OS} Device`,
      browser: true ? "Browser" : undefined,
    };
  }
};

/**
 * Generate a unique device identifier
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    // Web-safe identifier based on UA + screen dimensions.
    const fingerprint = `web_${navigator.userAgent}_${screen.width}x${screen.height}`;
    return btoa(fingerprint).substring(0, 32);
  } catch (error) {
    console.error("Error generating device ID:", error);
    return `${Platform.OS}_${Date.now()}`;
  }
};

/**
 * Get device type description
 */
export const getDeviceType = (): string => {
  return "Web Browser";
};

/**
 * Track device when user signs up or signs in
 */
export const trackDevice = async (userId: string): Promise<void> => {
  try {
    // Get client info from server (includes IP address)
    const clientInfo = await getClientInfo();

    // Get device ID and type
    const deviceId = await getDeviceId();
    const deviceType = clientInfo.deviceType || getDeviceType();

    // Get current devices from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("device_info")
      .eq("id", userId)
      .single();

    const currentDevices: DeviceInfo[] = profile?.device_info || [];

    // Check if this device already exists
    const existingDeviceIndex = currentDevices.findIndex(
      (d: DeviceInfo) => d.device_id === deviceId
    );

    const now = new Date().toISOString();

    if (existingDeviceIndex >= 0) {
      // Update existing device - mark as current and update last_active
      currentDevices[existingDeviceIndex] = {
        ...currentDevices[existingDeviceIndex],
        last_active: now,
        is_current: true,
        ip_address: clientInfo.ipAddress, // Update IP in case it changed
      };

      // Mark all other devices as not current
      currentDevices.forEach((device, index) => {
        if (index !== existingDeviceIndex) {
          device.is_current = false;
        }
      });
    } else {
      // Add new device
      const newDevice: DeviceInfo = {
        device_id: deviceId,
        device_type: deviceType,
        browser: clientInfo.browser,
        ip_address: clientInfo.ipAddress,
        first_seen: now,
        last_active: now,
        is_current: true,
      };

      // Mark all existing devices as not current
      currentDevices.forEach((device) => {
        device.is_current = false;
      });

      currentDevices.push(newDevice);
    }

    // Update profile with new device info
    const { error } = await supabase
      .from("profiles")
      .update({ device_info: currentDevices })
      .eq("id", userId);

    if (error) {
      console.error("Error updating device info:", error);
    } else {
      console.log("✅ Device tracked successfully");
    }
  } catch (error) {
    console.error("Error tracking device:", error);
    // Don't throw - device tracking should not block user flow
  }
};

/**
 * Get all devices for current user
 */
export const getUserDevices = async (userId: string): Promise<DeviceInfo[]> => {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("device_info")
      .eq("id", userId)
      .single();

    return profile?.device_info || [];
  } catch (error) {
    console.error("Error getting user devices:", error);
    return [];
  }
};

/**
 * Remove a device from user's device list
 */
export const removeDevice = async (
  userId: string,
  deviceId: string
): Promise<boolean> => {
  try {
    const devices = await getUserDevices(userId);
    const updatedDevices = devices.filter((d) => d.device_id !== deviceId);

    const { error } = await supabase
      .from("profiles")
      .update({ device_info: updatedDevices })
      .eq("id", userId);

    if (error) {
      console.error("Error removing device:", error);
      return false;
    }

    console.log("✅ Device removed successfully");
    return true;
  } catch (error) {
    console.error("Error removing device:", error);
    return false;
  }
};
