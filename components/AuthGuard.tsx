// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "./supabase";

// Wraps a page: requires a signed-in user, and optionally an admin (profiles.is_admin).
// Renders nothing until the check passes, so protected content never flashes.
export default function AuthGuard({ requireAdmin = false, children }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace(`/auth?redirect=${encodeURIComponent(router.asPath)}`);
        return;
      }
      if (requireAdmin) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();
        if (profile?.is_admin !== true) {
          router.replace("/home");
          return;
        }
      }
      if (!cancelled) setAllowed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [requireAdmin, router]);

  if (!allowed) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
        Checking access...
      </div>
    );
  }
  return <>{children}</>;
}

export const withAuthGuard = (Page, requireAdmin = false) => {
  const Guarded = (props) => (
    <AuthGuard requireAdmin={requireAdmin}>
      <Page {...props} />
    </AuthGuard>
  );
  Guarded.displayName = `Guarded(${Page.displayName || Page.name || "Page"})`;
  return Guarded;
};
