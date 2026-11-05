// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../components/supabase";
import { webStorage as AsyncStorage } from "../lib/webStorage";
import { fetchCurrentUserProfile, getMemberSinceDate } from "../lib/profileUtils";
import { getUserDevices, removeDevice, trackDevice } from "../lib/deviceTracking";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../types/notifications";
import { saveUserNotificationPreferences } from "../lib/notificationService";

const API_BASE_URL = "https://www.verrsa.org/api";
const EMPTY_PROFILE = {
  firstName: "", lastName: "", email: "", phone: "", username: "",
  isVerified: false, isOnline: true, memberSince: "", avatar: "",
};
const read = async (k) => {
  const v = await AsyncStorage.getItem(k);
  return v === null ? null : JSON.parse(v);
};

export function useProfileSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [isSupportAgent, setIsSupportAgent] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [locationServices, setLocationServices] = useState(false);
  const [locationOptions, setLocationOptions] = useState({ nearbyContent: true, tagLocation: true, recommendations: true });
  const [notificationPrefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [devices, setDevices] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const loadDevices = useCallback(async (userId) => {
    try { setDevices(await getUserDevices(userId)); } catch (e) { console.error(e); }
  }, []);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth"); return; }
    try {
      const p = await fetchCurrentUserProfile();
      setIsSupportAgent(p?.is_admin === true);
      setProfile({
        firstName: p?.firstName || user.user_metadata?.first_name || "",
        lastName: p?.lastName || user.user_metadata?.last_name || "",
        email: p?.email || user.email || "",
        phone: p?.phone || "",
        username: p?.username || user.email?.split("@")[0] || "",
        isVerified: p?.is_verified || false,
        isOnline: true,
        memberSince: getMemberSinceDate(user.created_at),
        avatar: p?.avatar_url || p?.avatar || user.user_metadata?.avatar_url || "",
      });
    } catch (e) { console.error("Error loading profile:", e); }

    const stored = await read("notificationsEnabled");
    const granted = typeof Notification !== "undefined" && Notification.permission === "granted";
    setNotifications(stored === null ? granted : !!stored && granted);
    const loc = await read("locationServicesEnabled");
    const opts = await read("locationOptions");
    const prefs = await read("notificationPreferences");
    if (loc !== null) setLocationServices(loc);
    if (opts) setLocationOptions(opts);
    if (prefs) setNotificationPrefs(prefs);

    const list = await getUserDevices(user.id);
    setDevices(list);
    if (list.length === 0) {
      await trackDevice(user.id);
      setTimeout(() => loadDevices(user.id), 1000);
    }
  }, [router, loadDevices]);

  useEffect(() => { load(); }, [load]);

  const toggleNotifications = async (val) => {
    if (val) {
      if (typeof Notification === "undefined") return alert("This browser does not support notifications.");
      if (Notification.permission === "denied")
        return alert("Notifications are blocked. Enable them in your browser's site settings.");
      if (Notification.permission !== "granted") {
        const res = await Notification.requestPermission();
        if (res !== "granted") return alert("Please allow notifications in your browser to enable them.");
      }
    }
    setNotifications(val);
    await AsyncStorage.setItem("notificationsEnabled", JSON.stringify(val));
  };

  const saveLocationOptions = async (opts) => {
    const any = Object.values(opts).some(Boolean);
    if (any) {
      if (!navigator.geolocation) return alert("Geolocation is not supported by this browser.");
      const ok = await new Promise((resolve) =>
        navigator.geolocation.getCurrentPosition(() => resolve(true), () => resolve(false)));
      if (!ok) return alert("Location permission denied");
    }
    setLocationOptions(opts);
    setLocationServices(any);
    await AsyncStorage.setItem("locationServicesEnabled", JSON.stringify(any));
    await AsyncStorage.setItem("locationOptions", JSON.stringify(opts));
    return true;
  };

  const disableLocation = async () => {
    const off = { nearbyContent: false, tagLocation: false, recommendations: false };
    setLocationServices(false);
    setLocationOptions(off);
    await AsyncStorage.setItem("locationServicesEnabled", JSON.stringify(false));
    await AsyncStorage.setItem("locationOptions", JSON.stringify(off));
  };

  const updatePref = async (category, key, value) => {
    const next = { ...notificationPrefs, [category]: { ...notificationPrefs[category], [key]: value } };
    setNotificationPrefs(next);
    await AsyncStorage.setItem("notificationPreferences", JSON.stringify(next));
  };

  const savePrefs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await saveUserNotificationPreferences(user.id, notificationPrefs);
      alert("Notification preferences saved");
      return true;
    } catch (e) { alert("Failed to save notification settings"); return false; }
  };

  const handleRemoveDevice = async (deviceId) => {
    if (!confirm("Are you sure you want to remove this device from your account?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ok = await removeDevice(user.id, deviceId);
    if (ok) loadDevices(user.id);
    else alert("Failed to remove device");
  };

  const changePassword = async () => {
    if (!confirm("You will be signed out and redirected to reset your password.")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: "https://www.verrsa.org/resetpassword",
    });
    if (error) return alert("Failed to send reset email. Please try again.");
    alert("We've sent a password reset link to your email address.");
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const deleteAccount = async () => {
    if (!confirm("This action cannot be undone. Are you sure you want to delete your account?")) return;
    try {
      setDeleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Unable to authenticate current session");
      const res = await fetch(`${API_BASE_URL}/delete-account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "user_requested" }),
      });
      const text = await res.text();
      let payload = null;
      try { payload = text ? JSON.parse(text) : null; } catch (e) {}
      if (!res.ok) throw new Error(payload?.error || text.substring(0, 100) || "Failed to delete account");
      await AsyncStorage.multiRemove(["notificationsEnabled", "locationServicesEnabled", "locationOptions"]);
      await supabase.auth.signOut();
      alert("Your Verrsa account has been deleted.");
      router.push("/auth");
    } catch (e) {
      alert(e instanceof Error ? e.message : "An unexpected error occurred. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return {
    profile, isSupportAgent, notifications, locationServices, locationOptions, notificationPrefs,
    devices, deleting, reload: load, toggleNotifications, saveLocationOptions, disableLocation,
    updatePref, savePrefs, handleRemoveDevice, changePassword, deleteAccount,
  };
}
