import axios from "axios";
import { ENV } from "./_core/env";

// QuickBooks Online OAuth 2.0 endpoints
const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QB_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
const QB_API_BASE = "https://quickbooks.api.intuit.com/v3/company";
const QB_SANDBOX_API_BASE = "https://sandbox-quickbooks.api.intuit.com/v3/company";

// Use production API
const getApiBase = () => QB_SANDBOX_API_BASE;

function getBasicAuthHeader() {
  return Buffer.from(`${ENV.qbClientId}:${ENV.qbClientSecret}`).toString("base64");
}

/**
 * Build the QuickBooks OAuth authorization URL
 */
export function getAuthorizationUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: ENV.qbClientId,
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });
  return `${QB_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access + refresh tokens
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const response = await axios.post(
    QB_TOKEN_URL,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
    {
      headers: {
        Authorization: `Basic ${getBasicAuthHeader()}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    }
  );

  return {
    accessToken: response.data.access_token as string,
    refreshToken: response.data.refresh_token as string,
    accessTokenExpiresIn: response.data.expires_in as number, // seconds (3600 = 1 hour)
    refreshTokenExpiresIn: response.data.x_refresh_token_expires_in as number, // seconds (8726400 = ~100 days)
  };
}

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
  const response = await axios.post(
    QB_TOKEN_URL,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
    {
      headers: {
        Authorization: `Basic ${getBasicAuthHeader()}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    }
  );

  return {
    accessToken: response.data.access_token as string,
    refreshToken: response.data.refresh_token as string,
    accessTokenExpiresIn: response.data.expires_in as number,
    refreshTokenExpiresIn: response.data.x_refresh_token_expires_in as number,
  };
}

/**
 * Revoke a token (access or refresh)
 */
export async function revokeToken(token: string) {
  await axios.post(
    QB_REVOKE_URL,
    new URLSearchParams({ token }).toString(),
    {
      headers: {
        Authorization: `Basic ${getBasicAuthHeader()}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    }
  );
}

/**
 * Get QuickBooks company info to verify connection
 */
export async function getCompanyInfo(accessToken: string, realmId: string) {
  const response = await axios.get(
    `${getApiBase()}/${realmId}/companyinfo/${realmId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );
  return response.data.CompanyInfo;
}

/**
 * Query the Chart of Accounts to find account references
 */
export async function queryAccounts(accessToken: string, realmId: string) {
  const response = await axios.get(
    `${getApiBase()}/${realmId}/query?query=${encodeURIComponent("SELECT * FROM Account WHERE Active = true MAXRESULTS 1000")}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );
  return response.data.QueryResponse?.Account || [];
}

/**
 * Create a Journal Entry in QuickBooks
 */
export async function createJournalEntry(
  accessToken: string,
  realmId: string,
  journalEntry: {
    txnDate: string; // YYYY-MM-DD
    docNumber?: string;
    privateNote?: string;
    lines: Array<{
      description: string;
      amount: number;
      postingType: "Debit" | "Credit";
      accountRef: { name: string; value: string };
    }>;
  }
) {
  const body = {
    TxnDate: journalEntry.txnDate,
    DocNumber: journalEntry.docNumber,
    PrivateNote: journalEntry.privateNote,
    Line: journalEntry.lines.map((line) => ({
      Description: line.description,
      Amount: Math.round(line.amount * 100) / 100,
      DetailType: "JournalEntryLineDetail",
      JournalEntryLineDetail: {
        PostingType: line.postingType,
        AccountRef: {
          name: line.accountRef.name,
          value: line.accountRef.value,
        },
      },
    })),
  };

  console.log("[QuickBooks] Creating journal entry:", JSON.stringify(body).substring(0, 500));

  try {
    const response = await axios.post(
      `${getApiBase()}/${realmId}/journalentry`,
      body,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
  
    console.log("[QuickBooks] Journal entry created:", response.data?.JournalEntry?.Id);
    return response.data.JournalEntry;
  
  } catch (error: any) {
    console.log("QB ERROR FULL:", JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
}

export async function getAccounts(
  accessToken: string,
  realmId: string
) {
  const response = await axios.get(
    `${getApiBase()}/${realmId}/query`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      params: {
        query: "select * from Account",
      },
    }
  );

  return response.data.QueryResponse.Account;
}
