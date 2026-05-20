/**
 * App Download Prompt Manager
 * Manages when to show the app download prompt modal
 */

const STORAGE_KEY = 'app_download_prompt_shown';
const STORAGE_DISMISSED_KEY = 'app_download_prompt_dismissed';
const PROMPT_DELAY_MS = 30 * 1000; // 30 seconds
const RESHOW_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Check if the app download prompt should be shown
 */
export const shouldShowAppDownloadPrompt = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    // Check if user dismissed the prompt
    const dismissedRaw = localStorage.getItem(STORAGE_DISMISSED_KEY);
    if (dismissedRaw) {
      const dismissedTime = parseInt(dismissedRaw, 10);
      // Don't show again for 7 days after dismissal
      if (Date.now() - dismissedTime < RESHOW_INTERVAL_MS) {
        return false;
      }
    }

    // Check if prompt was already shown in this session
    const shownRaw = sessionStorage.getItem(STORAGE_KEY);
    if (shownRaw) {
      return false; // Already shown in this session
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Mark the app download prompt as shown for this session
 */
export const markAppDownloadPromptShown = (): void => {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Mark the app download prompt as dismissed by user
 */
export const markAppDownloadPromptDismissed = (): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_DISMISSED_KEY, String(Date.now()));
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Get the delay before showing the prompt (in milliseconds)
 */
export const getPromptDelay = (): number => {
  return PROMPT_DELAY_MS;
};

/**
 * Reset all prompt tracking (useful for testing)
 */
export const resetAppDownloadPromptTracking = (): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_DISMISSED_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
};
