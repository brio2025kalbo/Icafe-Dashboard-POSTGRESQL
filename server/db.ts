import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { InsertUser, users, cafes, InsertCafe, userCafes, InsertUserCafe } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { encrypt, decrypt } from "./encryption";
import * as crypto from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };

    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // PostgreSQL conflict handling
    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// === Password Hashing ===

function hashPassword(password: string): string {
  // Using Node's built-in crypto with pbkdf2
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(":");
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return hash === verifyHash;
}

// === Local User Authentication ===

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(data: {
  username: string;
  password: string;
  name?: string;
  email?: string;
  role?: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if username already exists
  const existing = await getUserByUsername(data.username);
  if (existing) {
    throw new Error("Username already exists");
  }

  const hashedPassword = hashPassword(data.password);
  
  const result = await db.insert(users).values({
    username: data.username,
    password: hashedPassword,
    name: data.name || null,
    email: data.email || null,
    loginMethod: "local",
    role: data.role || "user",
    openId: null,
    lastSignedIn: new Date(),
  });

  return result;
}

export async function setActiveSessionToken(userId: number, token: string | null) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot set session token: database not available");
    return;
  }

  await db
    .update(users)
    .set({ activeSessionToken: token })
    .where(eq(users.id, userId));
}

export async function authenticateLocalUser(username: string, password: string) {
  const user = await getUserByUsername(username);

  if (!user || !user.password) {
    return null;
  }

  const isValid = verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  // Update last signed in
  const db = await getDb();
  if (db) {
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));
  }

  return user;
}

export async function updateUserProfile(userId: number, data: {
  name?: string;
  email?: string;
  password?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateSet: Record<string, unknown> = {};
  
  if (data.name !== undefined) {
    updateSet.name = data.name;
  }
  
  if (data.email !== undefined) {
    // Check if email is already used by another user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);
    
    if (existingUser.length > 0 && existingUser[0].id !== userId) {
      throw new Error("Email already in use by another user");
    }
    
    updateSet.email = data.email;
  }
  
  if (data.password !== undefined) {
    updateSet.password = hashPassword(data.password);
  }

  if (Object.keys(updateSet).length === 0) {
    return { success: true };
  }

  await db
    .update(users)
    .set(updateSet)
    .where(eq(users.id, userId));

  return { success: true };
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get users: database not available");
    return [];
  }

  const result = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      role: users.role,
      loginMethod: users.loginMethod,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users);

  return result;
}

export async function updateUser(id: number, data: {
  name?: string;
  email?: string;
  role?: "user" | "admin";
  password?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    updateData.name = data.name || null;
  }
  if (data.email !== undefined) {
    updateData.email = data.email || null;
  }
  if (data.role !== undefined) {
    updateData.role = data.role;
  }
  if (data.password !== undefined) {
    updateData.password = hashPassword(data.password);
  }

  const result = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id));

  return result;
}

export async function deleteUser(id: number, currentUserId?: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Prevent self-deletion
  if (currentUserId && id === currentUserId) {
    throw new Error("Cannot delete your own account");
  }

  // Check if this is the last admin
  const allUsers = await getAllUsers();
  const admins = allUsers.filter(u => u.role === "admin");
  const userToDelete = allUsers.find(u => u.id === id);
  
  if (userToDelete?.role === "admin" && admins.length <= 1) {
    throw new Error("Cannot delete the last admin user");
  }

  const result = await db
    .delete(users)
    .where(eq(users.id, id));

  return result;
}

// === Cafe CRUD ===

export async function getUserCafes(userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Join through user_cafes junction table to get cafes for this user
  const result = await db
    .select({
      id: cafes.id,
      name: cafes.name,
      cafeId: cafes.cafeId,
      location: cafes.location,
      timezone: cafes.timezone,
      isActive: cafes.isActive,
      createdAt: cafes.createdAt,
      updatedAt: cafes.updatedAt,
      role: userCafes.role,
    })
    .from(userCafes)
    .innerJoin(cafes, eq(userCafes.cafeId, cafes.id))
    .where(eq(userCafes.userId, userId));

  return result;
}

export async function getCafeById(cafeDbId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  // Check if user has access to this cafe through the junction table
  const accessCheck = await db
    .select()
    .from(userCafes)
    .where(and(eq(userCafes.cafeId, cafeDbId), eq(userCafes.userId, userId)))
    .limit(1);

  if (accessCheck.length === 0) return undefined;

  const result = await db
    .select()
    .from(cafes)
    .where(eq(cafes.id, cafeDbId))
    .limit(1);

  if (result.length === 0) return undefined;

  const cafe = result[0];
  return {
    ...cafe,
    apiKey: decrypt(cafe.apiKeyEncrypted),
  };
}

export async function addCafe(
  userId: number,
  data: { name: string; cafeId: string; apiKey: string; location?: string; timezone?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate and trim API key to avoid whitespace issues
  if (!data.apiKey) {
    throw new Error("API key is required");
  }
  const trimmedApiKey = data.apiKey.trim();
  if (!trimmedApiKey) {
    throw new Error("API key cannot be empty");
  }
  const encrypted = encrypt(trimmedApiKey);

  // Insert cafe and RETURN id (PostgreSQL)
  const result = await db
  .insert(cafes)
  .values({
    userId,
    name: data.name,
    cafeId: data.cafeId,
    apiKeyEncrypted: encrypted,
    location: data.location || null,
    timezone: data.timezone || null,
  })
  .returning({ id: cafes.id });

  // Validate result
  if (!result.length || !result[0].id) {
  throw new Error("Failed to get inserted cafe ID");
  }

  const cafeDbId = result[0].id;

  // Create junction table entry with "owner" role
  await db.insert(userCafes).values({
    userId,
    cafeId: cafeDbId,
    role: "owner",
  });

  return { success: true };
}

export async function updateCafe(
  cafeDbId: number,
  userId: number,
  data: { name?: string; cafeId?: string; apiKey?: string; location?: string; timezone?: string; isActive?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user is owner of this cafe
  const access = await db
    .select()
    .from(userCafes)
    .where(and(eq(userCafes.cafeId, cafeDbId), eq(userCafes.userId, userId)))
    .limit(1);

  if (access.length === 0) {
    throw new Error("Access denied: cafe not found");
  }

  // Only owners can update cafe settings
  if (access[0].role !== "owner") {
    throw new Error("Access denied: only owners can update cafe settings");
  }

  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.cafeId !== undefined) updateSet.cafeId = data.cafeId;
  if (data.apiKey) {
    const trimmedApiKey = data.apiKey.trim();
    if (!trimmedApiKey) {
      throw new Error("API key cannot be empty");
    }
    updateSet.apiKeyEncrypted = encrypt(trimmedApiKey);
  }
  if (data.location !== undefined) updateSet.location = data.location;
  if (data.timezone !== undefined) updateSet.timezone = data.timezone;
  if (data.isActive !== undefined) updateSet.isActive = data.isActive;

  if (Object.keys(updateSet).length === 0) return { success: true };

  await db
    .update(cafes)
    .set(updateSet)
    .where(eq(cafes.id, cafeDbId));

  return { success: true };
}

export async function deleteCafe(cafeDbId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user is owner of this cafe
  const access = await db
    .select()
    .from(userCafes)
    .where(and(eq(userCafes.cafeId, cafeDbId), eq(userCafes.userId, userId)))
    .limit(1);

  if (access.length === 0 || access[0].role !== "owner") {
    throw new Error("Access denied: only owners can delete cafes");
  }

  // Delete all user_cafe entries for this cafe
  await db.delete(userCafes).where(eq(userCafes.cafeId, cafeDbId));

  // Delete the cafe itself
  await db.delete(cafes).where(eq(cafes.id, cafeDbId));

  return { success: true };
}

export async function getAllUserCafesWithKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Join through user_cafes junction table
  const result = await db
    .select({
      id: cafes.id,
      userId: cafes.userId,
      name: cafes.name,
      cafeId: cafes.cafeId,
      apiKeyEncrypted: cafes.apiKeyEncrypted,
      location: cafes.location,
      timezone: cafes.timezone,
      isActive: cafes.isActive,
      createdAt: cafes.createdAt,
      updatedAt: cafes.updatedAt,
    })
    .from(userCafes)
    .innerJoin(cafes, eq(userCafes.cafeId, cafes.id))
    .where(and(eq(userCafes.userId, userId), eq(cafes.isActive, 1)));

  return result.map((cafe) => ({
    ...cafe,
    apiKey: decrypt(cafe.apiKeyEncrypted),
  }));
}

// === User-Cafe Assignment Management ===

export async function getCafeUsers(cafeDbId: number, requestingUserId: number) {
  const db = await getDb();
  if (!db) return [];

  // Check if requesting user has access to this cafe
  const access = await db
    .select()
    .from(userCafes)
    .where(and(eq(userCafes.cafeId, cafeDbId), eq(userCafes.userId, requestingUserId)))
    .limit(1);

  if (access.length === 0) {
    throw new Error("Access denied");
  }

  // Get all users assigned to this cafe
  const result = await db
    .select({
      userId: userCafes.userId,
      role: userCafes.role,
      createdAt: userCafes.createdAt,
      name: users.name,
      email: users.email,
      username: users.username,
    })
    .from(userCafes)
    .innerJoin(users, eq(userCafes.userId, users.id))
    .where(eq(userCafes.cafeId, cafeDbId));

  return result;
}

export async function assignUserToCafe(
  cafeDbId: number,
  targetUserId: number,
  requestingUserId: number,
  role: "owner" | "manager" | "viewer" = "viewer"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if requesting user is owner of this cafe
  const access = await db
    .select()
    .from(userCafes)
    .where(and(eq(userCafes.cafeId, cafeDbId), eq(userCafes.userId, requestingUserId)))
    .limit(1);

  if (access.length === 0 || access[0].role !== "owner") {
    throw new Error("Access denied: only owners can assign users to cafes");
  }

  // Check if target user already has access
  const existing = await db
    .select()
    .from(userCafes)
    .where(and(eq(userCafes.cafeId, cafeDbId), eq(userCafes.userId, targetUserId)))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("User is already assigned to this cafe");
  }

  // Create the assignment
  await db.insert(userCafes).values({
    userId: targetUserId,
    cafeId: cafeDbId,
    role,
  });

  return { success: true };
}

export async function removeUserFromCafe(
  cafeDbId: number,
  targetUserId: number,
  requestingUserId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if requesting user is owner of this cafe
  const access = await db
    .select()
    .from(userCafes)
    .where(and(eq(userCafes.cafeId, cafeDbId), eq(userCafes.userId, requestingUserId)))
    .limit(1);

  if (access.length === 0 || access[0].role !== "owner") {
    throw new Error("Access denied: only owners can remove users from cafes");
  }

  // Get all owners to check if we're removing the last one
  const owners = await db
    .select()
    .from(userCafes)
    .where(and(eq(userCafes.cafeId, cafeDbId), eq(userCafes.role, "owner")));

  // Check if target user is an owner and if they're the last one
  const targetIsOwner = owners.some(owner => owner.userId === targetUserId);
  if (targetIsOwner && owners.length === 1) {
    throw new Error("Cannot remove the last owner from a cafe");
  }

  // Remove the assignment
  await db
    .delete(userCafes)
    .where(and(eq(userCafes.cafeId, cafeDbId), eq(userCafes.userId, targetUserId)));

  return { success: true };
}

/*export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      role: users.role,
    })
    .from(users);

  return result;
}*/

// === QuickBooks Token Management ===

import { qbTokens, qbReportLogs, InsertQbReportLog } from "../drizzle/schema";

export async function getQbToken(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(qbTokens)
    .where(eq(qbTokens.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertQbToken(
  userId: number,
  data: {
    realmId: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
    companyName?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if token exists for this user
  const existing = await getQbToken(userId);

  if (existing) {
    await db
      .update(qbTokens)
      .set({
        realmId: data.realmId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt,
        companyName: data.companyName ?? existing.companyName,
      })
      .where(eq(qbTokens.userId, userId));
  } else {
    await db.insert(qbTokens).values({
      userId,
      realmId: data.realmId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accessTokenExpiresAt: data.accessTokenExpiresAt,
      refreshTokenExpiresAt: data.refreshTokenExpiresAt,
      companyName: data.companyName ?? null,
    });
  }
}

export async function deleteQbToken(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(qbTokens).where(eq(qbTokens.userId, userId));
}

// === QuickBooks Report Logs ===

export async function addQbReportLog(data: InsertQbReportLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(qbReportLogs).values(data);
  return result;
}

export async function getQbReportLogs(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const { desc } = await import("drizzle-orm");
  const result = await db
    .select()
    .from(qbReportLogs)
    .where(eq(qbReportLogs.userId, userId))
    .orderBy(desc(qbReportLogs.sentAt))
    .limit(limit);

  return result;
}

export async function getQbReportLogByDate(userId: number, cafeId: number, businessDate: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(qbReportLogs)
    .where(
      and(
        eq(qbReportLogs.userId, userId),
        eq(qbReportLogs.cafeId, cafeId),
        eq(qbReportLogs.businessDate, businessDate),
        eq(qbReportLogs.status, "success")
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// QuickBooks Auto-Send Settings
export async function getQbAutoSendSetting(userId: number, cafeId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const { qbAutoSendSettings } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(qbAutoSendSettings)
    .where(
      and(
        eq(qbAutoSendSettings.userId, userId),
        eq(qbAutoSendSettings.cafeId, cafeId)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertQbAutoSendSetting(params: {
  userId: number;
  cafeId: number;
  enabled: number;
  mode: "daily_time" | "business_day_end" | "last_shift";
  scheduleTime?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { qbAutoSendSettings } = await import("../drizzle/schema");
  
  // Check if setting exists
  const existing = await getQbAutoSendSetting(params.userId, params.cafeId);

  if (existing) {
    // Update existing
    await db
      .update(qbAutoSendSettings)
      .set({
        enabled: params.enabled,
        mode: params.mode,
        scheduleTime: params.scheduleTime || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(qbAutoSendSettings.userId, params.userId),
          eq(qbAutoSendSettings.cafeId, params.cafeId)
        )
      );
  } else {
    // Insert new
    await db.insert(qbAutoSendSettings).values({
      userId: params.userId,
      cafeId: params.cafeId,
      enabled: params.enabled,
      mode: params.mode,
      scheduleTime: params.scheduleTime || null,
    });
  }
}

export async function getAllEnabledQbAutoSendSettings() {
  const db = await getDb();
  if (!db) return [];

  const { qbAutoSendSettings } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(qbAutoSendSettings)
    .where(eq(qbAutoSendSettings.enabled, 1));

  return result;
}

/* ---------- FEEDBACK READ STATUS ---------- */

export async function getFeedbackReadStatus(userId: number, cafeId: number, logId: number) {
  const db = await getDb();
  if (!db) return null;

  const { feedbackReadStatus } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(feedbackReadStatus)
    .where(
      and(
        eq(feedbackReadStatus.userId, userId),
        eq(feedbackReadStatus.cafeId, cafeId),
        eq(feedbackReadStatus.logId, logId)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function getUserFeedbackReadStatuses(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { feedbackReadStatus } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(feedbackReadStatus)
    .where(eq(feedbackReadStatus.userId, userId));

  return result;
}

export async function setFeedbackReadStatus(
  userId: number,
  cafeId: number,
  logId: number,
  isRead: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { feedbackReadStatus } = await import("../drizzle/schema");

  // Check if exists
  const existing = await getFeedbackReadStatus(userId, cafeId, logId);

  if (existing) {
    // Update
    await db
      .update(feedbackReadStatus)
      .set({
        isRead,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(feedbackReadStatus.userId, userId),
          eq(feedbackReadStatus.cafeId, cafeId),
          eq(feedbackReadStatus.logId, logId)
        )
      );
  } else {
    // Insert
    await db.insert(feedbackReadStatus).values({
      userId,
      cafeId,
      logId,
      isRead,
    });
  }
}

export async function setMultipleFeedbackReadStatus(
  userId: number,
  cafeId: number,
  logIds: number[],
  isRead: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { feedbackReadStatus } = await import("../drizzle/schema");

  // Get existing records
  const existing = await db
    .select()
    .from(feedbackReadStatus)
    .where(
      and(
        eq(feedbackReadStatus.userId, userId),
        eq(feedbackReadStatus.cafeId, cafeId),
        inArray(feedbackReadStatus.logId, logIds)
      )
    );

  const existingLogIds = new Set(existing.map((r) => r.logId));
  const now = new Date();

  // Update existing records
  if (existingLogIds.size > 0) {
    await db
      .update(feedbackReadStatus)
      .set({
        isRead,
        updatedAt: now,
      })
      .where(
        and(
          eq(feedbackReadStatus.userId, userId),
          eq(feedbackReadStatus.cafeId, cafeId),
          inArray(feedbackReadStatus.logId, Array.from(existingLogIds))
        )
      );
  }

  // Insert new records
  const newLogIds = logIds.filter((id) => !existingLogIds.has(id));
  if (newLogIds.length > 0) {
    await db.insert(feedbackReadStatus).values(
      newLogIds.map((logId) => ({
        userId,
        cafeId,
        logId,
        isRead,
      }))
    );
  }
}
