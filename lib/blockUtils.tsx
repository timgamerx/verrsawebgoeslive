// @ts-nocheck
// Web stub for block utilities
export async function blockUser(userId: string): Promise<void> {}

export async function unblockUser(userId: string): Promise<void> {}

export async function getBlockedUsers(): Promise<string[]> {
  return [];
}

export async function fetchBlockedUserIds(): Promise<string[]> {
  return [];
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  return false;
}
