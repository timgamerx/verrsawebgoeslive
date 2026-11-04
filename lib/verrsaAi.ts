// Daily AI writes per plan. The server (verrsaai.py DAILY_LIMITS) is the
// source of truth; keep these in sync with the mobile app (lib/verrsaAi.ts).
export const VERRSA_AI_DAILY_LIMITS = {
  free: 5,
  basic: 15,
  premium: 40,
} as const;
