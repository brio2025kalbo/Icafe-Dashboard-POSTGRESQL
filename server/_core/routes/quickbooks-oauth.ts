import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { Router } from "express";

const router = Router();

const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

const clientId = process.env.QB_CLIENT_ID!;
const clientSecret = process.env.QB_CLIENT_SECRET!;
const redirectUri = process.env.QB_REDIRECT_URI!;

// Step 1: Redirect user to Intuit
router.get("/connect", (req, res) => {
  const state = uuidv4();

  const url =
    `${QB_AUTH_URL}?` +
    `client_id=${clientId}` +
    `&response_type=code` +
    `&scope=com.intuit.quickbooks.accounting` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  res.redirect(url);
});

// Step 2: Handle callback
router.get("/callback", async (req, res) => {
  const { code, realmId } = req.query;

  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

  try {
    const response = await axios.post(
      QB_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // 🔥 SAVE TO DATABASE HERE
    console.log("QB Connected:", {
      access_token,
      refresh_token,
      realmId,
      expires_in,
    });

    res.send("QuickBooks Connected Successfully!");
  } catch (err: any) {
    console.error("QB OAuth Error:", err.response?.data || err.message);
    res.status(500).send("OAuth failed");
  }
});

export default router;
