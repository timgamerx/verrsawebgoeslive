// @ts-nocheck

import React, { useEffect } from "react";
import { useRouter } from 'next/router';
import { supabase } from "../components/supabase";

/**
 * This page redirects to /user/[userId] to ensure consistent metadata
 * and user experience for both own profile and other user profiles.
 */
export default function Profile() {
  const router = useRouter();

  useEffect(() => {
    const redirectToUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Redirect to the user's profile page using their ID
          router.replace(`/user/${user.id}`);
        } else {
          // If not authenticated, redirect to auth page
          router.replace('/auth');
        }
      } catch (error) {
        console.error("Error redirecting to profile:", error);
        router.replace('/auth');
      }
    };

    redirectToUserProfile();
  }, [router]);

  // Show loading state while redirecting
  return (
    <div style={styles.container}>
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading profile...</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#fff",
    fontFamily: "'Instrument Sans', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #00BFFF",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
  loadingText: {
    fontSize: "16px",
    color: "#666",
    fontFamily: "'Instrument Sans', sans-serif",
  },
};
