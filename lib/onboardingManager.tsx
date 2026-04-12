'use client';

// @ts-nocheck
const KEY = "onboarding_data";

export async function saveOnboardingData(data: any) {
  try {
    const existing = await getOnboardingData();
    const merged = { ...(existing || {}), ...(data || {}) };
    localStorage.setItem(KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return data || {};
  }
}

export async function getOnboardingData() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearOnboardingData() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
