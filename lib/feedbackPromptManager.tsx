import { webStorage as AsyncStorage } from "./webStorage";
import { supabase } from "../components/supabase";

const STORAGE_KEY = "feedback_prompt_shown_at";
const SUBMITTED_KEY = "feedback_prompt_submitted";

/** Minimum days a user must have been signed up before seeing the prompt */
const MIN_SIGNUP_DAYS = 10;

/** Re-show the prompt after this many days if the user dismisses without submitting */
const RESOW_DAYS = 5;

/**
 * Check whether the feedback prompt should be shown.
 * Returns true when:
 *  1. The current user has been signed up for ≥ MIN_SIGNUP_DAYS days, AND
 *  2. We haven't shown the prompt recently (RESOW_DAYS cooldown).
 */
export const shouldShowFeedbackPrompt = async (): Promise<boolean> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // Determine signup date — prefer user.created_at, fall back to profile row
    let signupDateStr: string | null = user.created_at || null;
    if (!signupDateStr) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", user.id)
        .single();
      signupDateStr = profile?.created_at || null;
    }

    if (!signupDateStr) return false;

    const signupMs = new Date(signupDateStr).getTime();
    if (Number.isNaN(signupMs)) return false;

    const daysSinceSignup = (Date.now() - signupMs) / (24 * 60 * 60 * 1000);
    if (daysSinceSignup < MIN_SIGNUP_DAYS) return false;

    // Never show again if user has already submitted
    const submitted = await AsyncStorage.getItem(`${SUBMITTED_KEY}_${user.id}`);
    if (submitted) return false;

    // Check cooldown
    const lastShownRaw = await AsyncStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (lastShownRaw) {
      const lastShownMs = parseInt(lastShownRaw, 10);
      const daysSinceShown = (Date.now() - lastShownMs) / (24 * 60 * 60 * 1000);
      if (daysSinceShown < RESOW_DAYS) return false;
    }

    return true;
  } catch {
    return false;
  }
};

/** Permanently suppress the prompt after a successful submission. */
export const markFeedbackSubmitted = async (): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await AsyncStorage.setItem(`${SUBMITTED_KEY}_${user.id}`, "1");
  } catch {
    /* ignore */
  }
};

/** Record that the prompt was shown right now (starts cooldown timer). */
export const markFeedbackPromptShown = async (): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await AsyncStorage.setItem(`${STORAGE_KEY}_${user.id}`, String(Date.now()));
  } catch {
    /* ignore */
  }
};

/**
 * Submit feedback/testimonial to the `feedback` table.
 * Returns true on success.
 */
export const submitFeedback = async (
  rating: number,
  message: string,
): Promise<boolean> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      rating,
      message: message.trim(),
      submitted_at: new Date().toISOString(),
    });

    if (!error) {
      // Permanently suppress the prompt — user has given their feedback
      await markFeedbackSubmitted();
    }

    return !error;
  } catch {
    return false;
  }
};
