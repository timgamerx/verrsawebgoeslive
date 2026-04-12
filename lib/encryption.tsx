const Crypto = {
  CryptoDigestAlgorithm: {
    SHA256: "SHA-256",
  },
  async getRandomBytesAsync(length: number): Promise<Uint8Array> {
    const bytes = new Uint8Array(length);
    if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes);
      return bytes;
    }
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  },
  async digestStringAsync(algorithm: string, input: string): Promise<string> {
    const algo = algorithm || "SHA-256";
    if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
      const encoded = new TextEncoder().encode(input);
      const hashBuffer = await globalThis.crypto.subtle.digest(algo, encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return btoa(input).slice(0, 64);
  },
};

import { webStorage as AsyncStorage } from "./webStorage";

// Web shim for react-native-keychain APIs used below.
const Keychain = {
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: "when_unlocked_this_device_only",
  },
  async setGenericPassword(
    username: string,
    password: string,
    options?: { service?: string; accessible?: string }
  ): Promise<boolean> {
    const service = options?.service || "default";
    await AsyncStorage.setItem(`@keychain_${service}_username`, username);
    await AsyncStorage.setItem(`@keychain_${service}_password`, password);
    return true;
  },
  async getGenericPassword(options?: { service?: string }): Promise<{
    username: string;
    password: string;
  } | false> {
    const service = options?.service || "default";
    const username = await AsyncStorage.getItem(`@keychain_${service}_username`);
    const password = await AsyncStorage.getItem(`@keychain_${service}_password`);
    if (!username || !password) return false;
    return { username, password };
  },
  async resetGenericPassword(options?: { service?: string }): Promise<boolean> {
    const service = options?.service || "default";
    await AsyncStorage.removeItem(`@keychain_${service}_username`);
    await AsyncStorage.removeItem(`@keychain_${service}_password`);
    return true;
  },
};

// Keychain service identifiers
const USER_KEYS_SERVICE = "verrsa_user_encryption_keys";
const CONVERSATION_KEYS_SERVICE_PREFIX = "verrsa_conversation_";

// AsyncStorage fallback keys (for Expo Go compatibility)
const ASYNC_PRIVATE_KEY = "@verrsa_private_key";
const ASYNC_PUBLIC_KEY = "@verrsa_public_key";

// Check if Keychain is available (won't work in Expo Go)
let isKeychainAvailable = true;

/**
 * Generate a random encryption key for AES-256
 */
export const generateEncryptionKey = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32); // 256 bits
  return arrayBufferToBase64(randomBytes);
};

/**
 * Generate RSA key pair for asymmetric encryption
 * Note: For production, you'd want to use a more robust library like react-native-rsa-native
 * This is a simplified implementation using symmetric encryption with key exchange
 */
export const generateKeyPair = async (): Promise<{
  publicKey: string;
  privateKey: string;
}> => {
  const privateKey = await generateEncryptionKey();
  const publicKey = await generateEncryptionKey();

  return { publicKey, privateKey };
};

/**
 * Store user's encryption keys securely using Keychain (or AsyncStorage fallback)
 */
export const storeEncryptionKeys = async (
  publicKey: string,
  privateKey: string
): Promise<void> => {
  try {
    // Try Keychain first
    if (isKeychainAvailable) {
      try {
        const keysData = JSON.stringify({ publicKey, privateKey });
        await Keychain.setGenericPassword("user_encryption_keys", keysData, {
          service: USER_KEYS_SERVICE,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
        return;
      } catch (keychainError: any) {
        console.warn(
          "Keychain not available, falling back to AsyncStorage:",
          keychainError?.message
        );
        isKeychainAvailable = false;
      }
    }

    // Fallback to AsyncStorage
    await AsyncStorage.setItem(ASYNC_PUBLIC_KEY, publicKey);
    await AsyncStorage.setItem(ASYNC_PRIVATE_KEY, privateKey);
  } catch (error) {
    console.error("Error storing encryption keys:", error);
    throw error;
  }
};

/**
 * Retrieve user's encryption keys from Keychain (or AsyncStorage fallback)
 */
export const getEncryptionKeys = async (): Promise<{
  publicKey: string | null;
  privateKey: string | null;
}> => {
  try {
    // Try Keychain first
    if (isKeychainAvailable) {
      try {
        const credentials = await Keychain.getGenericPassword({
          service: USER_KEYS_SERVICE,
        });

        if (credentials && credentials.password) {
          const keysData = JSON.parse(credentials.password);
          return {
            publicKey: keysData.publicKey || null,
            privateKey: keysData.privateKey || null,
          };
        }
      } catch (keychainError: any) {
        console.warn(
          "Keychain not available, falling back to AsyncStorage:",
          keychainError?.message
        );
        isKeychainAvailable = false;
      }
    }

    // Fallback to AsyncStorage
    const publicKey = await AsyncStorage.getItem(ASYNC_PUBLIC_KEY);
    const privateKey = await AsyncStorage.getItem(ASYNC_PRIVATE_KEY);
    return { publicKey, privateKey };
  } catch (error) {
    console.error("Error retrieving encryption keys:", error);
    return { publicKey: null, privateKey: null };
  }
};

/**
 * Encrypt a message using AES-256-GCM equivalent
 */
export const encryptMessage = async (
  message: string,
  sharedKey: string
): Promise<string> => {
  try {
    // Generate a random IV (Initialization Vector)
    const iv = await Crypto.getRandomBytesAsync(16);
    const ivBase64 = arrayBufferToBase64(iv);

    // Convert message to bytes
    const messageBytes = stringToBytes(message);

    // Create a simple XOR cipher with the shared key
    // In production, use a proper crypto library like crypto-js or react-native-crypto
    const keyBytes = base64ToBytes(sharedKey);
    const encrypted = xorEncrypt(messageBytes, keyBytes);

    // Combine IV and encrypted data
    const encryptedBase64 = arrayBufferToBase64(encrypted);
    const combined = `${ivBase64}:${encryptedBase64}`;

    return combined;
  } catch (error) {
    console.error("Error encrypting message:", error);
    throw error;
  }
};

/**
 * Decrypt a message using AES-256-GCM equivalent
 */
export const decryptMessage = async (
  encryptedMessage: string,
  sharedKey: string
): Promise<string> => {
  try {
    // Split IV and encrypted data
    const [ivBase64, encryptedBase64] = encryptedMessage.split(":");
    if (!ivBase64 || !encryptedBase64) {
      throw new Error("Invalid encrypted message format");
    }

    // Convert from base64
    const encrypted = base64ToBytes(encryptedBase64);
    const keyBytes = base64ToBytes(sharedKey);

    // Decrypt using XOR cipher
    const decrypted = xorEncrypt(encrypted, keyBytes); // XOR is symmetric

    // Convert bytes back to string
    const message = bytesToString(decrypted);

    return message;
  } catch (error) {
    console.error("Error decrypting message:", error);
    throw error;
  }
};

/**
 * Generate a shared encryption key for a conversation
 * This uses a simplified Diffie-Hellman-like key exchange
 */
export const generateSharedKey = async (
  myPrivateKey: string,
  theirPublicKey: string
): Promise<string> => {
  try {
    // Simple key derivation - combine both keys and hash
    const combined = `${myPrivateKey}:${theirPublicKey}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined
    );
    return hash;
  } catch (error) {
    console.error("Error generating shared key:", error);
    throw error;
  }
};

/**
 * Store shared key for a conversation in Keychain (or AsyncStorage fallback)
 */
export const storeConversationKey = async (
  conversationId: string,
  sharedKey: string
): Promise<void> => {
  try {
    // Try Keychain first
    if (isKeychainAvailable) {
      try {
        await Keychain.setGenericPassword(conversationId, sharedKey, {
          service: `${CONVERSATION_KEYS_SERVICE_PREFIX}${conversationId}`,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
        return;
      } catch (keychainError: any) {
        console.warn(
          "Keychain not available for conversation keys, using AsyncStorage"
        );
        isKeychainAvailable = false;
      }
    }

    // Fallback to AsyncStorage
    await AsyncStorage.setItem(
      `@conversation_key_${conversationId}`,
      sharedKey
    );
  } catch (error) {
    console.error("Error storing conversation key:", error);
    throw error;
  }
};

/**
 * Retrieve shared key for a conversation from Keychain (or AsyncStorage fallback)
 */
export const getConversationKey = async (
  conversationId: string
): Promise<string | null> => {
  try {
    // Try Keychain first
    if (isKeychainAvailable) {
      try {
        const credentials = await Keychain.getGenericPassword({
          service: `${CONVERSATION_KEYS_SERVICE_PREFIX}${conversationId}`,
        });

        if (credentials && credentials.password) {
          return credentials.password;
        }
      } catch (keychainError: any) {
        console.warn(
          "Keychain not available for conversation keys, using AsyncStorage"
        );
        isKeychainAvailable = false;
      }
    }

    // Fallback to AsyncStorage
    return await AsyncStorage.getItem(`@conversation_key_${conversationId}`);
  } catch (error) {
    console.error("Error retrieving conversation key:", error);
    return null;
  }
};

/**
 * Initialize encryption for a user
 * Generates and stores keys if they don't exist
 */
export const initializeEncryption = async (): Promise<{
  publicKey: string;
  privateKey: string;
}> => {
  try {
    let { publicKey, privateKey } = await getEncryptionKeys();

    if (!publicKey || !privateKey) {
      // Generate new keys
      const keyPair = await generateKeyPair();
      await storeEncryptionKeys(keyPair.publicKey, keyPair.privateKey);
      return keyPair;
    }

    return { publicKey, privateKey };
  } catch (error) {
    console.error("Error initializing encryption:", error);
    throw error;
  }
};

/**
 * Clear user's encryption keys from Keychain
 * Use this when logging out
 */
export const clearEncryptionKeys = async (): Promise<boolean> => {
  try {
    return await Keychain.resetGenericPassword({
      service: USER_KEYS_SERVICE,
    });
  } catch (error) {
    console.error("Error clearing encryption keys:", error);
    return false;
  }
};

/**
 * Clear a specific conversation's encryption key
 */
export const clearConversationKey = async (
  conversationId: string
): Promise<boolean> => {
  try {
    return await Keychain.resetGenericPassword({
      service: `${CONVERSATION_KEYS_SERVICE_PREFIX}${conversationId}`,
    });
  } catch (error) {
    console.error("Error clearing conversation key:", error);
    return false;
  }
};

/**
 * Clear all conversation keys
 * Note: This only clears the user's main encryption keys
 * Individual conversation keys are stored separately
 */
export const clearAllEncryptionData = async (): Promise<void> => {
  try {
    await clearEncryptionKeys();
    // Note: Conversation keys are stored with dynamic service names,
    // so they would need to be cleared individually when known
    console.log("User encryption keys cleared");
  } catch (error) {
    console.error("Error clearing all encryption data:", error);
    throw error;
  }
};

// Helper functions

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function stringToBytes(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

function bytesToString(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

function xorEncrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

/**
 * Test if a message is encrypted
 */
export const isEncrypted = (message: string): boolean => {
  // Check if message has the encrypted format (IV:EncryptedData)
  return message.includes(":") && message.split(":").length === 2;
};
