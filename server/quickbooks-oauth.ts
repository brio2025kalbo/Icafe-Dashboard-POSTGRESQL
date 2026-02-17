import { Express, Request, Response } from "express";
import { getAuthorizationUrl, exchangeCodeForTokens, getCompanyInfo } from "./quickbooks-api";
import { upsertQbToken } from "./db";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

/**
 * Register QuickBooks OAuth routes on the Express app.
 * - GET /api/quickbooks/connect → redirects user to Intuit authorization page
 * - GET /api/quickbooks/callback → handles the OAuth callback from Intuit
 */
export function registerQuickBooksRoutes(app: Express) {
  // Step 1: Redirect user to QuickBooks authorization page
  app.get("/api/quickbooks/connect", async (req: Request, res: Response) => {
    try {
      // Verify user is logged in
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        return res.redirect("/?qb_error=not_authenticated");
      }

      // Use configured redirect URI or fall back to current origin
      const redirectUri = ENV.qbRedirectUri || (() => {
        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        return `${protocol}://${host}/api/quickbooks/callback`;
      })();

      // Generate state with user ID for CSRF protection
      const state = Buffer.from(JSON.stringify({
        userId: user.id,
        ts: Date.now(),
      })).toString("base64url");

      const authUrl = getAuthorizationUrl(redirectUri, state);
      console.log("[QuickBooks] Redirecting to auth URL, redirectUri:", redirectUri);
      res.redirect(authUrl);
    } catch (error) {
      console.error("[QuickBooks] Connect error:", error);
      res.redirect("/?qb_error=connect_failed");
    }
  });

  // Step 2: Handle OAuth callback from Intuit
  app.get("/api/quickbooks/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, realmId, error: qbError } = req.query;

      if (qbError) {
        console.error("[QuickBooks] OAuth error:", qbError);
        return res.redirect(`/?qb_error=${qbError}`);
      }

      if (!code || !state || !realmId) {
        return res.redirect("/?qb_error=missing_params");
      }

      // Decode state to get user ID
      let stateData: { userId: number; ts: number };
      try {
        stateData = JSON.parse(Buffer.from(state as string, "base64url").toString());
      } catch {
        return res.redirect("/?qb_error=invalid_state");
      }

      // Check state is not too old (5 minutes)
      if (Date.now() - stateData.ts > 5 * 60 * 1000) {
        return res.redirect("/?qb_error=state_expired");
      }

      // Use configured redirect URI or fall back to current origin (must match connect step)
      const redirectUri = ENV.qbRedirectUri || (() => {
        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        return `${protocol}://${host}/api/quickbooks/callback`;
      })();

      // Exchange code for tokens
      console.log("[QuickBooks] Exchanging code for tokens...");
      const tokens = await exchangeCodeForTokens(code as string, redirectUri);

      // Get company info
      let companyName: string | undefined;
      try {
        const companyInfo = await getCompanyInfo(tokens.accessToken, realmId as string);
        companyName = companyInfo?.CompanyName;
        console.log("[QuickBooks] Connected to company:", companyName);
      } catch (err) {
        console.warn("[QuickBooks] Could not fetch company info:", err);
      }

      // Store tokens in database
      const now = new Date();
      await upsertQbToken(stateData.userId, {
        realmId: realmId as string,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: new Date(now.getTime() + tokens.accessTokenExpiresIn * 1000),
        refreshTokenExpiresAt: new Date(now.getTime() + tokens.refreshTokenExpiresIn * 1000),
        companyName,
      });

      console.log("[QuickBooks] Tokens saved for user:", stateData.userId);
      res.redirect("/?qb_connected=true");
    } catch (error) {
      console.error("[QuickBooks] Callback error:", error);
      res.redirect("/?qb_error=callback_failed");
    }
  });
}
