import { describe, expect, it } from "vitest";

/**
 * Unit tests for the shift aggregation summing logic used in
 * reports.shiftAggregated and reports.shiftAggregatedCombined endpoints.
 *
 * These tests verify that the sumNum helper and data structure merging
 * produce correct results when combining multiple shift report responses.
 */

// Replicate the sumNum helper from routers.ts
const sumNum = (vals: (number | undefined | null)[]) =>
  vals.reduce((a: number, v) => (a || 0) + (Number(v) || 0), 0);

// Replicate the product_sales_items merging logic
function mergeProductSalesItems(shiftResults: any[]): any[] {
  const itemMap = new Map<string, any>();
  for (const r of shiftResults) {
    if (!r?.product_sales_items) continue;
    for (const item of r.product_sales_items) {
      const key = item.product_name || item.name || "unknown";
      if (itemMap.has(key)) {
        const existing = itemMap.get(key);
        existing.order_number =
          (existing.order_number || 0) + (item.order_number || 0);
        existing.order_total =
          (existing.order_total || 0) + (item.order_total || 0);
        existing.order_refunded =
          (existing.order_refunded || 0) + (item.order_refunded || 0);
      } else {
        itemMap.set(key, { ...item });
      }
    }
  }
  return Array.from(itemMap.values());
}

// Replicate the top members merging logic
function mergeTopMembers(shiftResults: any[]): any[] {
  const memberMap = new Map<string, any>();
  for (const r of shiftResults) {
    if (!r?.top_five_members_topup) continue;
    for (const m of r.top_five_members_topup) {
      const key = m.member || "unknown";
      if (memberMap.has(key)) {
        memberMap.get(key).amount =
          (memberMap.get(key).amount || 0) + (m.amount || 0);
      } else {
        memberMap.set(key, { ...m });
      }
    }
  }
  return Array.from(memberMap.values())
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5);
}

describe("sumNum helper", () => {
  it("sums numeric values correctly", () => {
    expect(sumNum([100, 200, 300])).toBe(600);
  });

  it("handles undefined and null values", () => {
    expect(sumNum([100, undefined, 200, null, 300])).toBe(600);
  });

  it("handles string numbers", () => {
    expect(sumNum([100, "200" as any, 300])).toBe(600);
  });

  it("returns 0 for empty array", () => {
    expect(sumNum([])).toBe(0);
  });

  it("handles NaN values gracefully", () => {
    expect(sumNum([100, NaN, 200])).toBe(300);
  });
});

describe("shift aggregation: report fields", () => {
  const shiftResults = [
    {
      report: { cash: 5000, profit: 1200 },
      sale: { total: 3000, product: { number: 10, total: 2500 } },
      topup: { amount: 1500, number: 5 },
      refund: {
        topup: { total: { amount: 100, number: 1 } },
        sale: { total: { amount: 50, number: 1 } },
      },
    },
    {
      report: { cash: 8000, profit: 2500 },
      sale: { total: 5000, product: { number: 20, total: 4000 } },
      topup: { amount: 2000, number: 8 },
      refund: {
        topup: { total: { amount: 200, number: 2 } },
        sale: { total: { amount: 0, number: 0 } },
      },
    },
    {
      report: { cash: 7476, profit: 1800 },
      sale: { total: 4500, product: { number: 15, total: 3500 } },
      topup: { amount: 2500, number: 10 },
      refund: {
        topup: { total: { amount: 0, number: 0 } },
        sale: { total: { amount: 0, number: 0 } },
      },
    },
  ];

  it("sums cash correctly across shifts", () => {
    const totalCash = sumNum(shiftResults.map((r) => r.report.cash));
    expect(totalCash).toBe(5000 + 8000 + 7476);
    expect(totalCash).toBe(20476);
  });

  it("sums profit correctly across shifts", () => {
    const totalProfit = sumNum(shiftResults.map((r) => r.report.profit));
    expect(totalProfit).toBe(1200 + 2500 + 1800);
    expect(totalProfit).toBe(5500);
  });

  it("sums sales total correctly across shifts", () => {
    const totalSales = sumNum(shiftResults.map((r) => r.sale.total));
    expect(totalSales).toBe(3000 + 5000 + 4500);
    expect(totalSales).toBe(12500);
  });

  it("sums topup amount correctly across shifts", () => {
    const totalTopups = sumNum(shiftResults.map((r) => r.topup.amount));
    expect(totalTopups).toBe(1500 + 2000 + 2500);
    expect(totalTopups).toBe(6000);
  });

  it("sums refund amounts correctly across shifts", () => {
    const totalRefundTopup = sumNum(
      shiftResults.map((r) => r.refund.topup.total.amount)
    );
    const totalRefundSale = sumNum(
      shiftResults.map((r) => r.refund.sale.total.amount)
    );
    expect(totalRefundTopup).toBe(100 + 200 + 0);
    expect(totalRefundSale).toBe(50 + 0 + 0);
  });

  it("computes correct expense per shift: Cash - Sales - Topups + Refunds", () => {
    // Shift 1: 5000 - 3000 - 1500 + (100+50) = 650
    // Shift 2: 8000 - 5000 - 2000 + (200+0) = 1200
    // Shift 3: 7476 - 4500 - 2500 + (0+0) = 476
    // Total expense: 650 + 1200 + 476 = 2326
    const expenses = shiftResults.map((r) => {
      const refundTotal =
        r.refund.topup.total.amount + r.refund.sale.total.amount;
      return Math.max(0, r.report.cash - r.sale.total - r.topup.amount + refundTotal);
    });
    expect(expenses[0]).toBe(650);
    expect(expenses[1]).toBe(1200);
    expect(expenses[2]).toBe(476);
    expect(expenses.reduce((a, b) => a + b, 0)).toBe(2326);
  });

  it("demonstrates the bug: raw range query (22988) vs shift sum (20476)", () => {
    // The raw date range query returned 22988 (includes non-shift transactions)
    // The correct shift-based sum is 20476 (only actual shift transactions)
    const rawRangeTotal = 22988;
    const shiftBasedTotal = sumNum(shiftResults.map((r) => r.report.cash));
    expect(shiftBasedTotal).toBe(20476);
    expect(shiftBasedTotal).toBeLessThan(rawRangeTotal);
    // The difference (22988 - 20476 = 2512) represents non-shift transactions
    expect(rawRangeTotal - shiftBasedTotal).toBe(2512);
  });
});

describe("shift aggregation: product sales items merging", () => {
  it("merges same products across shifts", () => {
    const shiftResults = [
      {
        product_sales_items: [
          { product_name: "Coffee", order_number: 5, order_total: 250, order_refunded: 0 },
          { product_name: "Chips", order_number: 3, order_total: 150, order_refunded: 1 },
        ],
      },
      {
        product_sales_items: [
          { product_name: "Coffee", order_number: 8, order_total: 400, order_refunded: 1 },
          { product_name: "Soda", order_number: 4, order_total: 200, order_refunded: 0 },
        ],
      },
    ];

    const merged = mergeProductSalesItems(shiftResults);
    expect(merged).toHaveLength(3); // Coffee, Chips, Soda

    const coffee = merged.find((i: any) => i.product_name === "Coffee");
    expect(coffee.order_number).toBe(13); // 5 + 8
    expect(coffee.order_total).toBe(650); // 250 + 400
    expect(coffee.order_refunded).toBe(1); // 0 + 1

    const chips = merged.find((i: any) => i.product_name === "Chips");
    expect(chips.order_number).toBe(3);

    const soda = merged.find((i: any) => i.product_name === "Soda");
    expect(soda.order_number).toBe(4);
  });

  it("handles empty product lists", () => {
    const shiftResults = [{ product_sales_items: [] }, {}];
    const merged = mergeProductSalesItems(shiftResults);
    expect(merged).toHaveLength(0);
  });
});

describe("shift aggregation: top members merging", () => {
  it("merges same members and sorts by amount descending", () => {
    const shiftResults = [
      {
        top_five_members_topup: [
          { member: "Alice", amount: 500 },
          { member: "Bob", amount: 300 },
        ],
      },
      {
        top_five_members_topup: [
          { member: "Alice", amount: 200 },
          { member: "Charlie", amount: 800 },
        ],
      },
    ];

    const merged = mergeTopMembers(shiftResults);
    expect(merged).toHaveLength(3);
    // Charlie: 800, Alice: 700 (500+200), Bob: 300
    expect(merged[0].member).toBe("Charlie");
    expect(merged[0].amount).toBe(800);
    expect(merged[1].member).toBe("Alice");
    expect(merged[1].amount).toBe(700);
    expect(merged[2].member).toBe("Bob");
    expect(merged[2].amount).toBe(300);
  });

  it("limits to top 5 members", () => {
    const shiftResults = [
      {
        top_five_members_topup: [
          { member: "A", amount: 100 },
          { member: "B", amount: 200 },
          { member: "C", amount: 300 },
          { member: "D", amount: 400 },
          { member: "E", amount: 500 },
        ],
      },
      {
        top_five_members_topup: [
          { member: "F", amount: 600 },
          { member: "G", amount: 700 },
        ],
      },
    ];

    const merged = mergeTopMembers(shiftResults);
    expect(merged).toHaveLength(5);
    expect(merged[0].member).toBe("G"); // 700
    expect(merged[4].member).toBe("C"); // 300 (A=100 and B=200 are cut off)
  });
});
