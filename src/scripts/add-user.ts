import { hashPassword } from "../lib/crypto";
import { getDb } from "../db";
import { users } from "../db/schema";
import readline from "readline";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].replace(/^--/, "");
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        parsed[key] = args[i + 1];
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }
  return parsed;
}

async function main() {
  const args = parseArgs();

  let name = (args["name"] as string) || "";
  let email = (args["email"] as string) || "";
  let password = (args["password"] as string) || "";
  const isProd = Boolean(args["prod"]);

  console.log("\n👤 === TrackTimer Team Member Provisioning ===");

  if (!name) {
    name = await prompt("Enter team member's full name: ");
  }
  if (!email) {
    email = await prompt("Enter team member's email: ");
  }
  if (!password) {
    password = await prompt("Enter password: ");
  }

  if (!name || !email || !password) {
    console.error("❌ Error: Name, email, and password are required.");
    process.exit(1);
  }

  email = email.toLowerCase().trim();
  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  const createdAt = Date.now();

  console.log("\n🔐 Hashed password generated successfully.");

  // Generate Cloudflare D1 SQL command
  const escapedName = name.replace(/'/g, "''");
  const escapedEmail = email.replace(/'/g, "''");
  const sql = `INSERT INTO users (id, name, email, password_hash, created_at) VALUES ('${userId}', '${escapedName}', '${escapedEmail}', '${passwordHash}', ${createdAt});`;

  // Insert into local Cloudflare D1
  const { execSync } = await import("child_process");
  try {
    execSync(`pnpm exec wrangler d1 execute tracktime-db --local --command "${sql}"`, {
      stdio: "pipe",
    });
    console.log(`✅ Successfully inserted into local Cloudflare D1!`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️ Notice executing on local D1:`, message);
  }

  // Insert into local fallback SQLite database
  try {
    const db = await getDb();
    await db.insert(users).values({
      id: userId,
      name,
      email,
      passwordHash,
      createdAt,
    });
    console.log(`✅ Successfully added user to local SQLite!`);
    console.log(`   ID: ${userId}`);
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNIQUE constraint failed")) {
      console.warn(`⚠️ User with email ${email} already exists locally.`);
    } else {
      console.warn(`⚠️ Local insert notice:`, message);
    }
  }

  console.log("\n📦 For Cloudflare D1 (Production):");
  console.log("Run this command with Wrangler to insert into your remote Cloudflare D1:");
  console.log(`\n  pnpm exec wrangler d1 execute tracktime-db --remote --yes --command "${sql}"\n`);

  if (isProd) {
    console.log("Executing on Cloudflare D1 remote via wrangler...");
    const { execSync } = await import("child_process");
    try {
      execSync(`pnpm exec wrangler d1 execute tracktime-db --remote --yes --command "${sql}"`, {
        stdio: "inherit",
      });
      console.log("✅ Successfully executed on remote D1!");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("❌ Failed to execute remote D1 command:", message);
    }
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
