/**
 * Tests for email + password authentication utilities and routes.
 */
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signJWT, verifyJWT } from "./auth";

describe("hashPassword / verifyPassword", () => {
  it("hashes a password and verifies it correctly", async () => {
    const plain = "supersecret123";
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(hash.length).toBeGreaterThan(20);
    const valid = await verifyPassword(plain, hash);
    expect(valid).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correcthorse");
    const valid = await verifyPassword("wrongpassword", hash);
    expect(valid).toBe(false);
  });
});

describe("signJWT / verifyJWT", () => {
  it("signs a token and verifies it", async () => {
    const payload = { sub: "42", email: "a@b.com", name: "Test", role: "user" as const };
    const token = await signJWT(payload);
    expect(typeof token).toBe("string");
    const decoded = await verifyJWT(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe("42");
    expect(decoded?.email).toBe("a@b.com");
    expect(decoded?.role).toBe("user");
  });

  it("returns null for a tampered token", async () => {
    const token = await signJWT({ sub: "1", email: "x@y.com", name: "X", role: "user" });
    const tampered = token.slice(0, -5) + "XXXXX";
    const result = await verifyJWT(tampered);
    expect(result).toBeNull();
  });

  it("returns null for an empty string", async () => {
    const result = await verifyJWT("");
    expect(result).toBeNull();
  });
});
