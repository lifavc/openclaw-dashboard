const DEVICE_KEY = "openclaw-dashboard-device";

interface StoredDevice {
  id: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

export interface DeviceIdentity {
  id: string;
  publicKey: string;
}

let cachedKeyPair: CryptoKeyPair | null = null;
let cachedDevice: StoredDevice | null = null;

function loadDevice(): StoredDevice | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveDevice(device: StoredDevice) {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
}

async function importKeyPair(device: StoredDevice): Promise<CryptoKeyPair> {
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    device.publicKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    device.privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );
  return { publicKey, privateKey };
}

async function exportPublicKeyBase64(key: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(spki)));
}

async function fingerprint(key: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey("spki", key);
  const hash = await crypto.subtle.digest("SHA-256", spki);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getOrCreateDevice(): Promise<{
  identity: DeviceIdentity;
  keyPair: CryptoKeyPair;
}> {
  if (cachedKeyPair && cachedDevice) {
    return {
      identity: {
        id: cachedDevice.id,
        publicKey: await exportPublicKeyBase64(cachedKeyPair.publicKey),
      },
      keyPair: cachedKeyPair,
    };
  }

  const stored = loadDevice();
  if (stored) {
    const keyPair = await importKeyPair(stored);
    cachedKeyPair = keyPair;
    cachedDevice = stored;
    return {
      identity: {
        id: stored.id,
        publicKey: await exportPublicKeyBase64(keyPair.publicKey),
      },
      keyPair,
    };
  }

  // Generate new keypair
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const id = await fingerprint(keyPair.publicKey);
  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const device: StoredDevice = { id, publicKeyJwk, privateKeyJwk };
  saveDevice(device);
  cachedKeyPair = keyPair;
  cachedDevice = device;

  return {
    identity: {
      id,
      publicKey: await exportPublicKeyBase64(keyPair.publicKey),
    },
    keyPair,
  };
}

export async function signChallenge(
  privateKey: CryptoKey,
  nonce: string
): Promise<string> {
  const data = new TextEncoder().encode(nonce);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    data
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
