#!/usr/bin/env node
import "dotenv/config";
import { createLocalUser } from "./server/db";

/**
 * Setup script to create an initial admin user
 * Usage: node setup-admin.mjs
 */

async function setupAdmin() {
  console.log("Creating initial admin user...");
  
  try {
    await createLocalUser({
      username: "admin",
      password: "admin123",
      name: "Administrator",
      email: "admin@example.com",
      role: "admin",
    });
    
    console.log("✓ Admin user created successfully!");
    console.log("  Username: admin");
    console.log("  Password: admin123");
    console.log("\nPlease change the password after first login!");
    process.exit(0);
  } catch (error) {
    if (error instanceof Error && error.message === "Username already exists") {
      console.log("Admin user already exists.");
      process.exit(0);
    }
    console.error("Failed to create admin user:", error);
    process.exit(1);
  }
}

setupAdmin();
