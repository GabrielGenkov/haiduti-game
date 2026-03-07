/**
 * OAuth routes have been removed. Email + password auth is now used instead.
 * This file is kept as a stub to avoid import errors from any remaining references.
 */
import type { Express } from "express";

/** @deprecated OAuth is no longer used. Use /api/auth/* endpoints instead. */
export function registerOAuthRoutes(_app: Express) {
  // No-op: OAuth routes removed. Authentication is handled via /api/auth/*.
}
