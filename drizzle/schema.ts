import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ---------- ENUMS ---------- */

export const roleEnum = pgEnum("role", ["user", "admin"]);

/* ---------- USERS ---------- */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  openId: varchar("openId", { length: 64 }),
  username: varchar("username", { length: 64 }).unique(),
  password: varchar("password", { length: 255 }),
  
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),

  role: roleEnum("role").default("user").notNull(),

  activeSessionToken: varchar("activeSessionToken", { length: 64 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/* ---------- CAFES ---------- */

export const cafes = pgTable("cafes", {
  id: serial("id").primaryKey(),

  userId: integer("userId").notNull(),

  name: varchar("name", { length: 255 }).notNull(),
  cafeId: varchar("cafeId", { length: 64 }).notNull(),

  apiKeyEncrypted: text("apiKeyEncrypted").notNull(),

  location: varchar("location", { length: 500 }),
  timezone: varchar("timezone", { length: 100 }),

  isActive: boolean("isActive").default(true).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Cafe = typeof cafes.$inferSelect;
export type InsertCafe = typeof cafes.$inferInsert;

export const qbTokens = pgTable("qb_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  realmId: varchar("realm_id", { length: 64 }).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),
  companyName: varchar("company_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type QbToken = typeof qbTokens.$inferSelect;
export type InsertQbToken = typeof qbTokens.$inferInsert;

export const qbStatusEnum = pgEnum("qb_status", [
  "success",
  "failed",
  "pending",
]);


export const qbReportLogs = pgTable("qb_report_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  cafeId: integer("cafe_id").notNull(),
  cafeName: varchar("cafe_name", { length: 255 }).notNull(),
  businessDate: varchar("business_date", { length: 10 }).notNull(),
  journalEntryId: varchar("journal_entry_id", { length: 64 }),
  totalCash: integer("total_cash"),
  shiftCount: integer("shift_count"),
  status: qbStatusEnum("status").default("pending").notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export type QbReportLog = typeof qbReportLogs.$inferSelect;
export type InsertQbReportLog = typeof qbReportLogs.$inferInsert;

// PostgreSQL enum must be declared separately
export const userCafeRoleEnum = pgEnum("user_cafe_role", [
  "owner",
  "manager",
  "viewer",
]);

// Junction table for many-to-many relationship between users and cafes
export const userCafes = pgTable(
  "user_cafes",
  {
    id: serial("id").primaryKey(),

    userId: integer("userId").notNull(),
    cafeId: integer("cafeId").notNull(),

    role: userCafeRoleEnum("role")
      .default("owner")
      .notNull(),

    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Ensure a user can only be assigned to a cafe once
    userCafeUnique: uniqueIndex("user_cafe_unique")
      .on(table.userId, table.cafeId),
  })
);

export type UserCafe = typeof userCafes.$inferSelect;
export type InsertUserCafe = typeof userCafes.$inferInsert;

export const qbAutoSendModeEnum = pgEnum("qb_auto_send_mode", [
  "daily_time",
  "business_day_end",
  "last_shift",
]);

export const qbAutoSendSettings = pgTable("qb_auto_send_settings", {
  id: serial("id").primaryKey(),

  userId: integer("userId").notNull(),
  cafeId: integer("cafeId").notNull(),

  // 0 = disabled, 1 = enabled
  enabled: integer("enabled").default(0).notNull(),

  mode: qbAutoSendModeEnum("mode").notNull(),

  // HH:MM format
  scheduleTime: varchar("scheduleTime", { length: 5 }),

  createdAt: timestamp("createdAt", { withTimezone: false })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updatedAt", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

export type QbAutoSendSetting =
  typeof qbAutoSendSettings.$inferSelect;

export type InsertQbAutoSendSetting =
  typeof qbAutoSendSettings.$inferInsert;

/* ---------- FEEDBACK ---------- */

export const feedbackReadStatus = pgTable(
  "feedback_read_status",
  {
    id: serial("id").primaryKey(),
    
    userId: integer("userId").notNull(),
    cafeId: integer("cafeId").notNull(),
    
    // log_id from iCafe API
    logId: integer("logId").notNull(),
    
    isRead: boolean("isRead").default(false).notNull(),
    
    createdAt: timestamp("createdAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
    
    updatedAt: timestamp("updatedAt", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Ensure unique feedback status per user and cafe
    userCafeFeedbackUnique: uniqueIndex("user_cafe_feedback_unique")
      .on(table.userId, table.cafeId, table.logId),
  })
);

export type FeedbackReadStatus = typeof feedbackReadStatus.$inferSelect;
export type InsertFeedbackReadStatus = typeof feedbackReadStatus.$inferInsert;