import * as crypto from "crypto";

export function encrypt(data: Buffer, algorithm: string, key: crypto.CipherKey, iv: crypto.BinaryLike | null): Buffer {
  let cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted;
}

export function decrypt(data: Buffer, algorithm: string, key: crypto.CipherKey, iv: crypto.BinaryLike | null): Buffer {
  let decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(data);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted;
}