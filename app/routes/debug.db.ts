import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";

export const loader = async (_args: LoaderFunctionArgs) => {
  try {
    await prisma.$connect();
    const count = await prisma.session.count();
    console.log("[debug] Vercel DB OK, session count:", count);
    return json({ ok: true, sessionCount: count });
  } catch (error) {
    console.error("[debug] Vercel DB ERROR:", error);
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  }
};

export const config = {
  runtime: "nodejs",
};

