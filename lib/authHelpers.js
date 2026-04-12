'use client';

import { supabase } from '../components/supabase';

// ─── Password Validation (client-safe) ────────────────────────────────────────
// Pure validation logic — no secrets involved.

export const validatePassword = (password) => {
  const feedback = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('• Password must be at least 8 characters');

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else feedback.push('• Include both uppercase and lowercase letters');

  if (/\d/.test(password)) score++;
  else feedback.push('• Include at least one number');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  else feedback.push('• Include at least one special character');

  return { isValid: score >= 3, score, feedback };
};

// ─── Username Helper (client-safe) ───────────────────────────────────────────

export const generateUsernameFromEmail = (mail) =>
  mail.split('@')[0].toLowerCase() + Math.floor(Math.random() * 1000);

// ─── Onboarding Data (client-safe, localStorage only) ────────────────────────

export const getOnboardingData = async () => {
  try {
    const data = localStorage.getItem('onboarding_data');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export const clearOnboardingData = async () => {
  localStorage.removeItem('onboarding_data');
};

// ─── Profile Creation (client-safe, Supabase RLS enforced) ───────────────────

export const createUserProfile = async (userId, userData) => {
  const onboarding = await getOnboardingData();

  const { error } = await supabase.from('profiles').insert([{
    id: userId,
    full_name: userData.full_name,
    username: userData.username,
    email: userData.email,
    bio: '',
    avatar_url: null,
    is_verified: false,
    subscription_tier: 'free',
    content_category: onboarding.contentCategories?.join(', ') || '',
    country_name: onboarding.countryName || null,
  }]);

  if (error) throw error;
  await clearOnboardingData();
};

// ─── User Enforcement (client-safe, Supabase RLS enforced) ───────────────────

export const getUserEnforcement = async (userId) => {
  try {
    const { data } = await supabase
      .from('user_enforcement')
      .select('enforcement_action, message')
      .eq('user_id', userId)
      .single();
    return data;
  } catch {
    return null;
  }
};

// ─── Rate Limiting — server-side via Edge Function ───────────────────────────
// The enforcement logic lives in the Edge Function, not in the client bundle.

export const rateLimiter = {
  checkLimit: async (action, identifier) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-rate-limit', {
        body: { action, identifier },
      });
      if (error) return { allowed: true }; // fail open on network error
      return data ?? { allowed: true };
    } catch {
      return { allowed: true };
    }
  },
};

// ─── Device Tracking — server-side via Edge Function ─────────────────────────
// Only the browser User-Agent is sent; fingerprinting logic stays server-side.

export const trackDevice = async (userId) => {
  try {
    await supabase.functions.invoke('track-device', {
      body: {
        userId,
        userAgent: navigator.userAgent,
      },
    });
  } catch (error) {
    console.error('Device tracking error:', error);
  }
};

// ─── 2FA (verification logic server-side via Edge Function) ──────────────────
// is2FAEnabled uses a simple DB read (RLS protected).
// verify2FACode delegates to the Edge Function — TOTP secret never reaches client.

export const twoFactorAuth = {
  is2FAEnabled: async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('id', userId)
        .single();
      return data?.two_factor_enabled ?? false;
    } catch {
      return false;
    }
  },

  verify2FACode: async (userId, code) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa', {
        body: { userId, code },
      });
      if (error) throw error;
      return data ?? { success: false, message: 'Verification failed' };
    } catch {
      return { success: false, message: 'Invalid verification code' };
    }
  },
};

// ─── Email Notifications — server-side via Edge Function ─────────────────────
// Email templates, API keys, and SMTP config never leave the server.

export const sendSignupNotifications = async (email, fullName, username) => {
  try {
    await supabase.functions.invoke('send-signup-notifications', {
      body: { email, fullName, username },
    });
  } catch (error) {
    console.error('Signup notification error:', error);
  }
};
