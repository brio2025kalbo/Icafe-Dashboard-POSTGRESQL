import { describe, expect, it } from "vitest";
import { encrypt, decrypt } from "./encryption";

describe("encryption", () => {
  it("encrypts and decrypts a string correctly", () => {
    const original = "my-secret-api-key-12345";
    const encrypted = encrypt(original);

    // Encrypted should be different from original
    expect(encrypted).not.toBe(original);

    // Should contain the expected format (iv:tag:ciphertext)
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);

    // Decrypted should match original
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertexts for the same input", () => {
    const original = "same-key";
    const encrypted1 = encrypt(original);
    const encrypted2 = encrypt(original);

    // Due to random IV, encrypted values should differ
    expect(encrypted1).not.toBe(encrypted2);

    // Both should decrypt to the same value
    expect(decrypt(encrypted1)).toBe(original);
    expect(decrypt(encrypted2)).toBe(original);
  });

  it("handles empty string", () => {
    const original = "";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("handles special characters", () => {
    const original = "key-with-special-chars!@#$%^&*(){}[]|\\:\";<>?,./~`";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("throws on invalid encrypted text format", () => {
    expect(() => decrypt("invalid-text")).toThrow("Invalid encrypted text format");
  });
});
