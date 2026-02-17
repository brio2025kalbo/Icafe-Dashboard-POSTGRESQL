#!/usr/bin/env tsx

/**
 * Migration script to move existing cafe-user relationships
 * to the user_cafes junction table.
 *
 * Steps:
 * 1. Read all cafes with userId
 * 2. Create entries in user_cafes as owner
 * 3. Skip already migrated entries
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { cafes, userCafes } from "./drizzle/schema";
import { eq, and } from "drizzle-orm";

async function migrateCafeUsers(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("🚀 Starting cafe-user migration...");

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    const allCafes = await db.select().from(cafes);

    console.log(`📊 Found ${allCafes.length} cafes to migrate`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const cafe of allCafes) {
      try {
        if (!cafe.userId) {
          console.log(`⏭️ Skipping cafe "${cafe.name}" (no owner)`);
          skipped++;
          continue;
        }

        const existing = await db
          .select()
          .from(userCafes)
          .where(
            and(
              eq(userCafes.cafeId, cafe.id),
              eq(userCafes.userId, cafe.userId)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          console.log(
            `⏭️ Skipping "${cafe.name}" (junction exists)`
          );
          skipped++;
          continue;
        }

        await db.insert(userCafes).values({
          userId: cafe.userId,
          cafeId: cafe.id,
          role: "owner",
        });

        console.log(
          `✅ Migrated "${cafe.name}" -> user ${cafe.userId} as owner`
        );

        migrated++;
      } catch (error) {
        console.error(
          `❌ Error migrating "${cafe.name}":`,
          error
        );
        errors++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 Migration Summary:");
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️ Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log("=".repeat(60));

    await pool.end();

    if (errors > 0) {
      console.log("\n⚠️ Migration completed with errors.");
      process.exit(1);
    }

    console.log("\n🎉 Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    await pool.end();
    process.exit(1);
  }
}

migrateCafeUsers();
