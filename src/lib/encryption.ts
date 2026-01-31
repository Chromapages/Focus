import crypto from 'crypto';

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new Error('APP_ENCRYPTION_KEY_NOT_SET');

  // Accept 32-byte base64 or 64-char hex.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');

  const b64 = raw.replace(/^base64:/, '');
  const buf = Buffer.from(b64, 'base64');
  if (buf.length !== 32) throw new Error('APP_ENCRYPTION_KEY_INVALID_LENGTH');
  return buf;
}

export type EncryptedStringV1 = {
  v: 1;
  alg: 'A256GCM';
  ivB64: string;
  tagB64: string;
  dataB64: string;
};

export function encryptString(plaintext: string): EncryptedStringV1 {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    v: 1,
    alg: 'A256GCM',
    ivB64: iv.toString('base64'),
    tagB64: tag.toString('base64'),
    dataB64: data.toString('base64'),
  };
}

export function decryptString(payload: EncryptedStringV1): string {
  const key = getKey();
  if (payload.v !== 1 || payload.alg !== 'A256GCM') throw new Error('ENCRYPTION_UNSUPPORTED_PAYLOAD');

  const iv = Buffer.from(payload.ivB64, 'base64');
  const tag = Buffer.from(payload.tagB64, 'base64');
  const data = Buffer.from(payload.dataB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString('utf8');
}
