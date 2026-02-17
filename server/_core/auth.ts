import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export function registerAuthRoutes(app: Express) {
  // Local login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    try {
      const user = await db.authenticateLocalUser(username, password);
      
      if (!user) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }

      // Create session token using user ID as identifier
      const sessionToken = await sdk.createSessionToken(`local:${user.id}`, {
        name: user.name || username,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ 
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Local registration endpoint
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { username, password, name, email } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
      res.status(400).json({ 
        error: "Username must be 3-32 characters and contain only letters, numbers, underscores, and hyphens" 
      });
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters long" });
      return;
    }

    try {
      await db.createLocalUser({
        username,
        password,
        name: name || null,
        email: email || null,
        role: "user", // New users are always regular users
      });

      // Automatically log in after registration
      const user = await db.getUserByUsername(username);
      if (!user) {
        throw new Error("User creation failed");
      }

      const sessionToken = await sdk.createSessionToken(`local:${user.id}`, {
        name: user.name || username,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ 
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      });
    } catch (error) {
      console.error("[Auth] Registration failed", error);
      if (error instanceof Error && error.message === "Username already exists") {
        res.status(409).json({ error: "Username already exists" });
      } else {
        res.status(500).json({ error: "Registration failed" });
      }
    }
  });
}
