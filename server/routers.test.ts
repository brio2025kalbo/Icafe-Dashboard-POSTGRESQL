import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      hostname: "localhost",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-123");
    expect(result?.name).toBe("Test User");
  });

  it("returns null when not authenticated", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
    });
  });
});

describe("cafes.list", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.cafes.list()).rejects.toThrow();
  });
});

describe("pcs.list", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.pcs.list({ cafeDbId: 1 })
    ).rejects.toThrow();
  });
});

describe("members.list", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.members.list({ cafeDbId: 1 })
    ).rejects.toThrow();
  });
});

describe("reports.data", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.reports.data({
        cafeDbId: 1,
        dateStart: "2025-01-01",
        dateEnd: "2025-01-31",
      })
    ).rejects.toThrow();
  });
});

describe("reports.shiftAggregated", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.reports.shiftAggregated({
        cafeDbId: 1,
        dateStart: "2025-01-01",
        dateEnd: "2025-01-31",
      })
    ).rejects.toThrow();
  });

  it("accepts valid input with time range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw on valid input (will return 404 since cafe doesn't exist in test DB)
    const result = await caller.reports.shiftAggregated({
      cafeDbId: 999,
      dateStart: "2025-01-01",
      dateEnd: "2025-01-31",
      timeStart: "00:00",
      timeEnd: "23:59",
    });
    expect(result).toHaveProperty("code");
    expect(result.code).toBe(404);
  });
});

describe("reports.shiftAggregatedCombined", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.reports.shiftAggregatedCombined({
        dateStart: "2025-01-01",
        dateEnd: "2025-01-31",
      })
    ).rejects.toThrow();
  });

  it("returns an array of cafe results", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reports.shiftAggregatedCombined({
      dateStart: "2025-01-01",
      dateEnd: "2025-01-31",
      timeStart: "00:00",
      timeEnd: "23:59",
    });
    expect(Array.isArray(result)).toBe(true);
    // Each result should have the expected shape
    for (const cafe of result) {
      expect(cafe).toHaveProperty("cafeDbId");
      expect(cafe).toHaveProperty("cafeName");
      expect(cafe).toHaveProperty("cafeId");
      expect(cafe).toHaveProperty("code");
    }
  });
});
