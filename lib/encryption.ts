import {
  type CipherGCMTypes,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is not set.");

  if (key.length === 64) return Buffer.from(key, "hex");

  const salt = Buffer.alloc(Number(process.env.SALT_LENGTH), 0);
  return scryptSync(key, salt, 32);
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = randomBytes(Number(process.env.IV_LENGTH));
  const cipher = createCipheriv(
    process.env.ALGORITHM as CipherGCMTypes,
    key,
    iv,
  );

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext?.includes(":")) return ciphertext;

  try {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(":");

    if (!ivHex || !authTagHex || !encrypted) return ciphertext;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = createDecipheriv(
      process.env.ALGORITHM as CipherGCMTypes,
      key,
      iv,
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    return ciphertext;
  }
}

export function encryptNumber(value: number | string): string {
  return encrypt(String(value));
}

export function decryptNumber(ciphertext: string): string {
  const decrypted = decrypt(ciphertext);
  return decrypted;
}

export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(":");
  return parts.length === 3 && parts[0].length === 24;
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex");
}
