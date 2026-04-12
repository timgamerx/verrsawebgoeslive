'use client';

// @ts-nocheck
import { webStorage as AsyncStorage } from "./webStorage";
import { supabase } from "../components/supabase";

export interface StoredAccount {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_verified?: boolean;
  subscription_plan?: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  isActive: boolean;
}

class AccountManager {
  private static readonly ACCOUNTS_KEY = "stored_accounts";
  private static readonly ACTIVE_ACCOUNT_KEY = "active_account_id";
  private static readonly TARGET_ACCOUNT_KEY = "target_account_id";

  /**
   * Cross-platform storage wrapper
   * Uses localStorage on web, AsyncStorage on native
   */
  private async getItem(key: string): Promise<string | null> {
    if (true) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error("localStorage getItem error:", error);
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  }

  private async setItem(key: string, value: string): Promise<void> {
    if (true) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (error) {
        console.error("localStorage setItem error:", error);
        throw error;
      }
    }
    return AsyncStorage.setItem(key, value);
  }

  private async removeItem(key: string): Promise<void> {
    if (true) {
      try {
        localStorage.removeItem(key);
        return;
      } catch (error) {
        console.error("localStorage removeItem error:", error);
        throw error;
      }
    }
    return AsyncStorage.removeItem(key);
  }

  /**
   * Get all stored accounts
   */
  async getStoredAccounts(): Promise<StoredAccount[]> {
    try {
      const accountsJson = await this.getItem(AccountManager.ACCOUNTS_KEY);
      return accountsJson ? JSON.parse(accountsJson) : [];
    } catch (error) {
      console.error("Error getting stored accounts:", error);
      return [];
    }
  }

  /**
   * Get the currently active account
   */
  async getActiveAccount(): Promise<StoredAccount | null> {
    try {
      const accounts = await this.getStoredAccounts();
      const activeAccountId = await this.getItem(
        AccountManager.ACTIVE_ACCOUNT_KEY,
      );

      if (!activeAccountId) {
        // Return the first account if no active account is set
        return accounts.length > 0 ? accounts[0] : null;
      }

      return accounts.find((account) => account.id === activeAccountId) || null;
    } catch (error) {
      console.error("Error getting active account:", error);
      return null;
    }
  }

  /**
   * Store a new account or update existing one
   */
  async storeAccount(
    session: any,
    userProfile?: any,
    makeActive: boolean = true,
  ): Promise<void> {
    try {
      const accounts = await this.getStoredAccounts();

      console.log("Storing account:", session.user.email);
      console.log(
        "Session expires at:",
        session.expires_at
          ? new Date(session.expires_at * 1000)
          : "No expiry info",
      );

      const accountData: StoredAccount = {
        id: session.user.id,
        email: session.user.email,
        full_name:
          userProfile?.full_name || session.user.user_metadata?.full_name || "",
        avatar_url:
          userProfile?.avatar_url ||
          session.user.user_metadata?.avatar_url ||
          "",
        is_verified: userProfile?.is_verified || false,
        subscription_plan: userProfile?.subscription_plan || "free",
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at:
          session.expires_at || Math.floor(Date.now() / 1000) + 60 * 60 * 24, // Default to 24 hours if no expiry
        isActive: makeActive,
      };

      // Remove existing account if it exists
      const existingIndex = accounts.findIndex(
        (acc) => acc.id === accountData.id,
      );
      if (existingIndex >= 0) {
        // Update existing account but preserve its active state if we're not making this one active
        accounts[existingIndex] = {
          ...accountData,
          isActive: makeActive ? true : accounts[existingIndex].isActive,
        };
      } else {
        if (makeActive) {
          // Set all other accounts to inactive only if this should be active
          accounts.forEach((acc) => (acc.isActive = false));
        }
        accounts.push(accountData);
      }

      await this.setItem(AccountManager.ACCOUNTS_KEY, JSON.stringify(accounts));

      if (makeActive) {
        await this.setItem(AccountManager.ACTIVE_ACCOUNT_KEY, accountData.id);
      }

      console.log("Account stored successfully");
    } catch (error) {
      console.error("Error storing account:", error);
      throw error;
    }
  }

  /**
   * Add a new account without making it active
   */
  async addAccount(session: any, userProfile?: any): Promise<void> {
    return this.storeAccount(session, userProfile, false);
  }

  /**
   * Switch to a different account
   */
  async switchToAccount(accountId: string): Promise<boolean> {
    try {
      const accounts = await this.getStoredAccounts();
      const targetAccount = accounts.find((acc) => acc.id === accountId);

      if (!targetAccount) {
        throw new Error("Account not found");
      }

      console.log("Switching to account:", targetAccount.email);
      console.log(
        "Token expires at:",
        new Date(targetAccount.expires_at * 1000),
      );

      // Ensure we have at least a refresh token before attempting refresh operations
      if (!targetAccount.refresh_token) {
        console.error(
          "No refresh token available for account:",
          targetAccount.email,
        );
        throw new Error(
          `No refresh token stored for ${targetAccount.email}. Please re-authenticate this account.`,
        );
      }

      // Try to set the session first, then handle refresh if needed
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: targetAccount.access_token,
          refresh_token: targetAccount.refresh_token,
        });

      if (sessionError || !sessionData?.session) {
        console.log("Session invalid, attempting refresh...");

        // Try to refresh the token using the refresh token
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession({
            refresh_token: targetAccount.refresh_token,
          });

        if (refreshError || !refreshData?.session) {
          console.error("Token refresh failed:", refreshError);
          // Clear the stored refresh token for this account to avoid repeated failed refresh attempts
          try {
            const cleanedAccounts = accounts.map((acc) =>
              acc.id === targetAccount.id ? { ...acc, refresh_token: "" } : acc,
            );
            await this.setItem(
              AccountManager.ACCOUNTS_KEY,
              JSON.stringify(cleanedAccounts),
            );
            console.log(
              "Cleared stored refresh token for account:",
              targetAccount.email,
            );
          } catch (e) {
            console.error("Failed to clear stored refresh token:", e);
          }

          // Provide a clearer error for the UI and avoid calling supabase methods without a session
          throw new Error(
            `Session expired or invalid refresh token for ${targetAccount.email}. Please re-authenticate this account.`,
          );
        }

        // Update stored account with new tokens
        targetAccount.access_token = refreshData.session.access_token;
        targetAccount.refresh_token = refreshData.session.refresh_token;
        targetAccount.expires_at = refreshData.session.expires_at || 0;

        // Ensure the Supabase client has the refreshed session explicitly
        await supabase.auth.setSession({
          access_token: targetAccount.access_token,
          refresh_token: targetAccount.refresh_token,
        });

        console.log("Token refreshed successfully");
      }

      // Update active states in storage
      const updatedAccounts = accounts.map((acc) => ({
        ...acc,
        isActive: acc.id === accountId,
        // Update tokens if this is the target account
        ...(acc.id === accountId
          ? {
              access_token: targetAccount.access_token,
              refresh_token: targetAccount.refresh_token,
              expires_at: targetAccount.expires_at,
            }
          : {}),
      }));

      await this.setItem(
        AccountManager.ACCOUNTS_KEY,
        JSON.stringify(updatedAccounts),
      );
      await this.setItem(AccountManager.ACTIVE_ACCOUNT_KEY, accountId);

      console.log("Account switched successfully to:", targetAccount.email);
      return true;
    } catch (error) {
      console.error("Error switching account:", error);
      throw error;
    }
  }

  /**
   * Remove an account from storage
   */
  async removeAccount(accountId: string): Promise<void> {
    try {
      const accounts = await this.getStoredAccounts();
      const filteredAccounts = accounts.filter((acc) => acc.id !== accountId);

      await this.setItem(
        AccountManager.ACCOUNTS_KEY,
        JSON.stringify(filteredAccounts),
      );

      // If we removed the active account, set another one as active
      const activeAccountId = await this.getItem(
        AccountManager.ACTIVE_ACCOUNT_KEY,
      );
      if (activeAccountId === accountId && filteredAccounts.length > 0) {
        filteredAccounts[0].isActive = true;
        await this.setItem(
          AccountManager.ACTIVE_ACCOUNT_KEY,
          filteredAccounts[0].id,
        );
        await this.setItem(
          AccountManager.ACCOUNTS_KEY,
          JSON.stringify(filteredAccounts),
        );
      } else if (filteredAccounts.length === 0) {
        await this.removeItem(AccountManager.ACTIVE_ACCOUNT_KEY);
      }
    } catch (error) {
      console.error("Error removing account:", error);
      throw error;
    }
  }

  /**
   * Sign out from current account but keep it stored
   */
  async signOutCurrentAccount(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  /**
   * Sign out and remove current account
   */
  async signOutAndRemoveAccount(): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await this.removeAccount(user.id);
      }
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out and removing account:", error);
    }
  }

  /**
   * Clear all stored accounts
   */
  async clearAllAccounts(): Promise<void> {
    try {
      await this.removeItem(AccountManager.ACCOUNTS_KEY);
      await this.removeItem(AccountManager.ACTIVE_ACCOUNT_KEY);
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error clearing all accounts:", error);
    }
  }

  /**
   * Get user profile for an account
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, is_verified, subscription_plan")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in getUserProfile:", error);
      return null;
    }
  }

  /**
   * Initialize account manager - call this when app starts
   */
  async initialize(): Promise<void> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Check if this is a new account being added
        const existingAccounts = await this.getStoredAccounts();
        const isNewAccount = !existingAccounts.find(
          (acc) => acc.id === session.user.id,
        );

        // Fetch user profile and store the current session
        const profile = await this.getUserProfile(session.user.id);

        if (isNewAccount && existingAccounts.length > 0) {
          // This is a new account being added, don't make it active by default
          await this.storeAccount(session, profile, false);
          console.log("New account added:", session.user.email);
        } else {
          // This is the first account or existing account, make it active
          await this.storeAccount(session, profile, true);
          console.log("Account initialized:", session.user.email);
        }
      }
    } catch (error) {
      console.error("Error initializing account manager:", error);
    }
  }

  /**
   * Check if we're in the middle of adding a new account
   */
  async isAddingNewAccount(): Promise<boolean> {
    try {
      const accounts = await this.getStoredAccounts();
      return accounts.length > 0; // If we have existing accounts, we might be adding a new one
    } catch (error) {
      return false;
    }
  }

  /**
   * Set target account for switching (useful for web where we need to sign out first)
   */
  async setTargetAccount(accountId: string): Promise<void> {
    try {
      await this.setItem(AccountManager.TARGET_ACCOUNT_KEY, accountId);
      console.log(`Target account set to: ${accountId}`);
    } catch (error) {
      console.error("Error setting target account:", error);
      throw error;
    }
  }

  /**
   * Get target account for switching
   */
  async getTargetAccount(): Promise<string | null> {
    try {
      return await this.getItem(AccountManager.TARGET_ACCOUNT_KEY);
    } catch (error) {
      console.error("Error getting target account:", error);
      return null;
    }
  }

  /**
   * Clear target account after switching
   */
  async clearTargetAccount(): Promise<void> {
    try {
      await this.removeItem(AccountManager.TARGET_ACCOUNT_KEY);
      console.log("Target account cleared");
    } catch (error) {
      console.error("Error clearing target account:", error);
    }
  }
}

export const accountManager = new AccountManager();
