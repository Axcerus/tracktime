// Web Crypto based PBKDF2 password hashing & HMAC session signing (Cloudflare Edge & Node compatible)

const ITERATIONS = 100000;
const KEY_LEN = 32; // 256 bits
const DEFAULT_SECRET = "tracktimer-super-secret-session-key-change-in-prod-123456";

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LEN * 8
  );

  const saltHex = bufferToHex(salt.buffer);
  const hashHex = bufferToHex(derivedKey);
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;

  const [saltHex, originalHashHex] = parts;
  const salt = hexToBuffer(saltHex);
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LEN * 8
  );

  const newHashHex = bufferToHex(derivedKey);
  return newHashHex === originalHashHex;
}

// Session Token (HMAC-SHA256)
export interface SessionData {
  userId: string;
  name: string;
  email: string;
  exp: number;
}

function base64UrlEncode(str: string): string {
  const b64 = typeof Buffer !== "undefined"
    ? Buffer.from(str).toString("base64")
    : btoa(str);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return typeof Buffer !== "undefined"
    ? Buffer.from(b64, "base64").toString("utf-8")
    : atob(b64);
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(
  data: Omit<SessionData, "exp">,
  secret: string = process.env.SESSION_SECRET || DEFAULT_SECRET,
  expiresInSeconds: number = 60 * 60 * 24 * 30 // 30 days
): Promise<string> {
  const session: SessionData = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const payload = base64UrlEncode(JSON.stringify(session));
  const key = await getHmacKey(secret);
  const enc = new TextEncoder();
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const sig = base64UrlEncode(String.fromCharCode(...new Uint8Array(sigBuffer)));

  return `${payload}.${sig}`;
}

export async function verifySession(
  token: string,
  secret: string = process.env.SESSION_SECRET || DEFAULT_SECRET
): Promise<SessionData | null> {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;

    const key = await getHmacKey(secret);
    const enc = new TextEncoder();
    const rawSigStr = base64UrlDecode(sig);
    const sigBytes = new Uint8Array(rawSigStr.length);
    for (let i = 0; i < rawSigStr.length; i++) {
      sigBytes[i] = rawSigStr.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes.buffer, enc.encode(payload));
    if (!isValid) return null;

    const data: SessionData = JSON.parse(base64UrlDecode(payload));
    if (data.exp < Math.floor(Date.now() / 1000)) {
      return null; // expired
    }

    return data;
  } catch {
    return null;
  }
}
