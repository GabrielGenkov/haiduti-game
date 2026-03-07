/**
 * Self-contained auth utilities for email + password authentication.
 * Uses bcryptjs for password hashing and jose for JWT signing/verification.
 */
import * as bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";

const SALT_ROUNDS = 12;

/** Hash a plain-text password. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Compare a plain-text password against a stored hash. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** JWT payload stored in the session cookie. */
export interface SessionPayload {
  sub: string;   // user id as string
  email: string;
  name: string;
  role: "user" | "admin";
}

function getJwtSecret(): Uint8Array {
  const secret = ENV.cookieSecret;
  if (!secret) throw new Error("JWT_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

/** Sign a JWT and return the compact token string. */
export async function signJWT(payload: SessionPayload, expiresInMs = 365 * 24 * 60 * 60 * 1000): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + expiresInMs) / 1000))
    .sign(secret);
}

/** Verify a JWT and return its payload, or null if invalid/expired. */
export async function verifyJWT(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
