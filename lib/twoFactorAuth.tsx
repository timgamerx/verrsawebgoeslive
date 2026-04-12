// @ts-nocheck
// Web-safe stub for two-factor auth during migration.
export const twoFactorAuth = {
  async is2FAEnabled(userId: string): Promise<boolean> {
    return false;
  },

  async verify2FACode(code: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  },
};
