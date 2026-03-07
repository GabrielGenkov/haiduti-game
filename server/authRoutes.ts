/**
 * Email + password authentication REST endpoints.
 *
 * POST /api/auth/register  — create account, set session cookie
 * POST /api/auth/login     — verify credentials, set session cookie
 * POST /api/auth/logout    — clear session cookie
 * GET  /api/auth/me        — return current user from JWT (or 401)
 */
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { hashPassword, verifyPassword, signJWT } from "./auth";
import { createUser, getUserByEmail, getUserById, touchLastSignedIn } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { verifyJWT } from "./auth";
import { parse as parseCookies } from "cookie";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function registerAuthRoutes(app: Express) {
  // ── Register ──────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !validateEmail(email)) {
      res.status(400).json({ error: "Valid email is required" });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const displayName = (name ?? "").trim() || email.split("@")[0];

    try {
      const existing = await getUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: "Email already registered" });
        return;
      }

      const passwordHash = await hashPassword(password);
      const user = await createUser(email, passwordHash, displayName);

      const token = await signJWT({
        sub: String(user.id),
        email: user.email,
        name: user.name,
        role: user.role,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (err) {
      console.error("[Auth] Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    try {
      const user = await getUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      await touchLastSignedIn(user.id);

      const token = await signJWT({
        sub: String(user.id),
        email: user.email,
        name: user.name,
        role: user.role,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (err) {
      console.error("[Auth] Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  // ── Me ────────────────────────────────────────────────────────────────────
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const cookies = parseCookies(req.headers.cookie ?? "");
      const token = cookies[COOKIE_NAME];
      if (!token) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const payload = await verifyJWT(token);
      if (!payload) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      const user = await getUserById(parseInt(payload.sub, 10));
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (err) {
      console.error("[Auth] Me error:", err);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
}
