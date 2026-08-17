import { eq } from "drizzle-orm";
import { connection, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { mobilePushToken } from "@/db/schema";
import {
  errorResponse,
  getMobileSession,
  successResponse,
  unauthorizedResponse,
} from "@/lib/mobile-auth";

const registerSchema = z.object({
  expoPushToken: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

export async function POST(request: NextRequest) {
  await connection();

  try {
    const session = await getMobileSession();
    if (!session?.user) return unauthorizedResponse();

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid push token data", 400);

    const { expoPushToken, platform } = parsed.data;

    await db
      .insert(mobilePushToken)
      .values({
        userId: session.user.id,
        expoPushToken,
        platform,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: mobilePushToken.expoPushToken,
        set: {
          userId: session.user.id,
          platform,
          updatedAt: new Date(),
        },
      });

    return successResponse({ ok: true });
  } catch (error) {
    console.error("Failed to register push token:", error);
    return errorResponse("Failed to register push token", 500);
  }
}

const unregisterSchema = z.object({
  expoPushToken: z.string().min(1),
});

export async function DELETE(request: NextRequest) {
  await connection();

  try {
    const session = await getMobileSession();
    if (!session?.user) return unauthorizedResponse();

    const body = await request.json().catch(() => ({}));
    const parsed = unregisterSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid push token data", 400);

    await db
      .delete(mobilePushToken)
      .where(eq(mobilePushToken.expoPushToken, parsed.data.expoPushToken));

    return successResponse({ ok: true });
  } catch (error) {
    console.error("Failed to unregister push token:", error);
    return errorResponse("Failed to unregister push token", 500);
  }
}
