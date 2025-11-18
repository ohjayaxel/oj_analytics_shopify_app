import { PrismaClient } from "@prisma/client";

function maskDatabaseUrl(dbUrl: string) {
  try {
    const parsed = new URL(dbUrl);
    const password = parsed.password ? "***" : "";
    return `${parsed.protocol}//${parsed.username}:${password}@${parsed.hostname}:${parsed.port || "default"}${parsed.pathname}${parsed.search}`;
  } catch {
    return "<unparseable>";
  }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not set. Add it to your environment (e.g. .env.local).");
    process.exit(1);
  }

  console.log("🔍 Testing database connectivity using:");
  console.log("   DATABASE_URL:", maskDatabaseUrl(dbUrl));

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log("✅ DB connected");

    try {
      const count = await prisma.session.count();
      console.log("✅ Session table reachable. Row count:", count);
    } catch (sessionError) {
      console.error("⚠️ Could not query Session table.");
      console.error(sessionError);
    }
  } catch (error) {
    console.error("❌ Could not connect to DB.");
    console.error(error);
  } finally {
    await prisma.$disconnect().catch((err) => {
      console.error("⚠️ Failed to disconnect Prisma client:", err);
    });
  }
}

main().catch((error) => {
  console.error("❌ Unexpected error during DB test:", error);
  process.exit(1);
});

