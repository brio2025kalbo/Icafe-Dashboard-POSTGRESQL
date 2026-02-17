import "dotenv/config";
import { createLocalUser } from "./server/db";

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

    console.log("✓ Admin user created!");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

setupAdmin();
