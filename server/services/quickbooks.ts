import QuickBooks from "node-quickbooks";

interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  realmId: string;
  sandbox?: boolean;
}

export function createQuickBooksClient(config: QuickBooksConfig) {
  return new QuickBooks(
    config.clientId,
    config.clientSecret,
    config.accessToken,
    false,
    config.realmId,
    config.sandbox ?? false,
    true,
    null,
    "2.0",
    config.refreshToken
  );
}

export async function createDailySales(
  qb: QuickBooks,
  amount: number,
  date: string
) {
  return new Promise((resolve, reject) => {
    qb.createSalesReceipt(
      {
        TxnDate: date,
        Line: [
          {
            Amount: amount,
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: {
              ItemRef: { value: "1" }, // Your default Sales item ID
            },
          },
        ],
        CustomerRef: { value: "1" }, // Walk-in customer ID
        PrivateNote: "Daily iCafe Sales Summary",
      },
      (err, data) => {
        if (err) return reject(err);
        resolve(data);
      }
    );
  });
}

export async function createDailyRefund(
  qb: QuickBooks,
  amount: number,
  date: string
) {
  return new Promise((resolve, reject) => {
    qb.createRefundReceipt(
      {
        TxnDate: date,
        Line: [
          {
            Amount: amount,
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: {
              ItemRef: { value: "1" },
            },
          },
        ],
        PrivateNote: "Daily iCafe Refund Summary",
      },
      (err, data) => {
        if (err) return reject(err);
        resolve(data);
      }
    );
  });
}

export async function createDailyExpense(
  qb: QuickBooks,
  amount: number,
  date: string
) {
  return new Promise((resolve, reject) => {
    qb.createPurchase(
      {
        TxnDate: date,
        Line: [
          {
            Amount: amount,
            DetailType: "AccountBasedExpenseLineDetail",
            AccountBasedExpenseLineDetail: {
              AccountRef: { value: "7" }, // Expense Account ID
            },
          },
        ],
        PrivateNote: "Daily iCafe Expense Summary",
      },
      (err, data) => {
        if (err) return reject(err);
        resolve(data);
      }
    );
  });
}

export async function refreshAccessToken(refreshToken: string) {
    const response = await axios.post(
      QB_TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
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
  
    return response.data;
  }
  
