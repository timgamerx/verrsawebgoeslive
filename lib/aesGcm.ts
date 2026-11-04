// @ts-nocheck
/**
 * Web port of the mobile lib/aesGcm.ts (WebCrypto only). Formats are identical so
 * web and mobile can read each other's messages:
 * - ECDH P-256 key pair per browser; public key published as `ec1:<raw point b64>`.
 * - 1:1 key = HKDF-SHA256(ECDH secret, salt=<id>, info="verrsa-dm-v2").
 * - Text: `v2:<iv>:<ciphertext>:<tag>`; bytes: iv(12) || ciphertext || tag(16).
 */
export const V2_PREFIX = "v2:";
export const PUBLIC_KEY_PREFIX = "ec1:";

const LS_PUB = "verrsa_ec_public_v2";
const LS_PRIV = "verrsa_ec_private_v2";
const DM_INFO = "verrsa-dm-v2";
const TAG_LEN = 16;
const IV_LEN = 12;
const CURVE = { name: "ECDH", namedCurve: "P-256" };

export const isV2Supported = () =>
  typeof window !== "undefined" && !!window.crypto?.subtle;

const subtle = () => window.crypto.subtle;
const utf8 = (s: string) => new TextEncoder().encode(s);
const toBytes = (b: any) => new Uint8Array(b);

export const bytesToB64 = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

export const b64ToBytes = (b64: string) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

const randomBytes = (n: number) => window.crypto.getRandomValues(new Uint8Array(n));
export const randomKey32 = () => randomBytes(32);

let cachedKeys: { publicKey: string; privateKey: string } | null = null;

/** This browser's EC key pair, generated on first use (kept in localStorage). */
export const getOrCreateEcKeys = async () => {
  if (cachedKeys) return cachedKeys;
  const publicKey = localStorage.getItem(LS_PUB);
  const privateKey = localStorage.getItem(LS_PRIV);
  if (publicKey && privateKey) {
    cachedKeys = { publicKey, privateKey };
    return cachedKeys;
  }
  const pair = await subtle().generateKey(CURVE, true, ["deriveBits"]);
  const pub = bytesToB64(toBytes(await subtle().exportKey("raw", pair.publicKey)));
  const priv = JSON.stringify(await subtle().exportKey("jwk", pair.privateKey));
  localStorage.setItem(LS_PUB, pub);
  localStorage.setItem(LS_PRIV, priv);
  cachedKeys = { publicKey: pub, privateKey: priv };
  return cachedKeys;
};

export const getPublishablePublicKey = async () =>
  `${PUBLIC_KEY_PREFIX}${(await getOrCreateEcKeys()).publicKey}`;

export const isEcPublicKey = (key?: string | null) =>
  !!key && key.startsWith(PUBLIC_KEY_PREFIX);

const hkdf32 = async (secret: Uint8Array, salt: string, info: string) => {
  const base = await subtle().importKey("raw", secret, "HKDF", false, ["deriveBits"]);
  const bits = await subtle().deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: utf8(salt), info: utf8(info) },
    base,
    256,
  );
  return toBytes(bits);
};

const keyCache = new Map<string, Uint8Array>();

/** 32-byte AES key shared between me and the owner of `theirPublicKey`. */
export const deriveConversationKey = async (id: string, theirPublicKey: string) => {
  const cacheId = `${id}:${theirPublicKey}`;
  const hit = keyCache.get(cacheId);
  if (hit) return hit;
  const { privateKey } = await getOrCreateEcKeys();
  const priv = await subtle().importKey("jwk", JSON.parse(privateKey), CURVE, false, ["deriveBits"]);
  const theirRaw = b64ToBytes(theirPublicKey.replace(PUBLIC_KEY_PREFIX, ""));
  const pub = await subtle().importKey("raw", theirRaw, CURVE, false, []);
  const secret = toBytes(await subtle().deriveBits({ name: "ECDH", public: pub }, priv, 256));
  const key = await hkdf32(secret, id, DM_INFO);
  keyCache.set(cacheId, key);
  return key;
};

/** Older community-id key (messages starting with `v2:` in community chat). */
export const deriveCommunityKey = (communityId: string) =>
  hkdf32(
    utf8(`verrsa-community:${communityId}`),
    "verrsa-community-v2",
    "verrsa-community-chat",
  );

const gcmEncrypt = async (data: Uint8Array, key: Uint8Array) => {
  const iv = randomBytes(IV_LEN);
  const k = await subtle().importKey("raw", key, "AES-GCM", false, ["encrypt"]);
  const out = toBytes(await subtle().encrypt({ name: "AES-GCM", iv, tagLength: 128 }, k, data));
  return { iv, ct: out.slice(0, out.length - TAG_LEN), tag: out.slice(out.length - TAG_LEN) };
};

const gcmDecrypt = async (iv: Uint8Array, ct: Uint8Array, tag: Uint8Array, key: Uint8Array) => {
  const k = await subtle().importKey("raw", key, "AES-GCM", false, ["decrypt"]);
  return toBytes(
    await subtle().decrypt({ name: "AES-GCM", iv, tagLength: 128 }, k, concat(ct, tag)),
  );
};

export const encryptV2 = async (plaintext: string, key: Uint8Array) => {
  const { iv, ct, tag } = await gcmEncrypt(utf8(plaintext), key);
  return `${V2_PREFIX}${bytesToB64(iv)}:${bytesToB64(ct)}:${bytesToB64(tag)}`;
};

export const decryptV2 = async (payload: string, key: Uint8Array) => {
  const [iv, ct, tag] = payload.slice(V2_PREFIX.length).split(":");
  if (!iv || !ct || !tag) throw new Error("Invalid v2 encrypted message format");
  const out = await gcmDecrypt(b64ToBytes(iv), b64ToBytes(ct), b64ToBytes(tag), key);
  return new TextDecoder().decode(out);
};

export const encryptBytesV2 = async (data: Uint8Array, key: Uint8Array) => {
  const { iv, ct, tag } = await gcmEncrypt(data, key);
  return concat(iv, ct, tag);
};

export const decryptBytesV2 = async (payload: Uint8Array, key: Uint8Array) => {
  if (payload.length < IV_LEN + TAG_LEN) throw new Error("Invalid v2 payload");
  return gcmDecrypt(
    payload.slice(0, IV_LEN),
    payload.slice(IV_LEN, payload.length - TAG_LEN),
    payload.slice(payload.length - TAG_LEN),
    key,
  );
};
