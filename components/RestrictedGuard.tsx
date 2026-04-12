// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useEffect } from "react";
import { supabase } from '../components/supabase';
import { getUserEnforcement } from '../lib/enforcement';

export default function RestrictedGuard() {
  const router = useRouter();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    const checkAndRedirect = async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes?.user?.id;
        if (!userId) return;

        const enforcement = await getUserEnforcement(userId);

        const isActive = !!(
          enforcement &&
          enforcement.enforcement_action &&
          enforcement.enforcement_action !== "none"
        );

        if (isActive) {
          if (window.location.pathname !== "/restricted") {
            router.push("/restricted");
          }
        } else {
          // Enforcement lifted: if currently on /restricted, return home
          if (window.location.pathname === "/restricted") {
            router.push("/");
          }
        }
      } catch (err) {
        // Silent failure: do not disrupt navigation
        console.log("RestrictedGuard check error:", err);
      }
    };

    // Initial check on mount
    checkAndRedirect();
    intervalId = setInterval(checkAndRedirect, 15000);

    // Subscribe to changes affecting enforcement
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) return;

      channel = supabase
        .channel(`enforcement:user:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "reported_users",
            filter: `reported_user_id=eq.${userId}`,
          },
          () => {
            if (!mounted) return;
            checkAndRedirect();
          },
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return null;
}
