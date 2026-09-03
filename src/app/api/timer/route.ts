import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { timeEntries } from "@/db/schema";
import { eq, and, isNull, gte, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();

    // Find currently active session (endTime is null)
    const activeList = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.userId, user.userId), isNull(timeEntries.endTime)))
      .orderBy(desc(timeEntries.startTime))
      .limit(1);

    const activeEntry = activeList[0] || null;

    // Calculate today's total logged time for this user
    // Client can pass tzOffset in minutes (e.g., from new Date().getTimezoneOffset())
    const tzOffsetParam = req.nextUrl.searchParams.get("tzOffset");
    const tzOffsetMinutes = tzOffsetParam ? parseInt(tzOffsetParam, 10) : 0;

    // Calculate start of today in client's local time
    const now = new Date();
    const clientLocalTime = new Date(now.getTime() - tzOffsetMinutes * 60 * 1000);
    clientLocalTime.setUTCHours(0, 0, 0, 0);
    const startOfDayMs = clientLocalTime.getTime() + tzOffsetMinutes * 60 * 1000;

    const todayEntries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, user.userId),
          gte(timeEntries.startTime, startOfDayMs)
        )
      );

    let todayTotalMs = 0;
    for (const entry of todayEntries) {
      if (entry.endTime) {
        todayTotalMs += entry.endTime - entry.startTime;
      }
    }

    return NextResponse.json({
      activeEntry,
      todayTotalMs,
    });
  } catch (error) {
    console.error("Timer GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();
    const body = await req.json().catch(() => ({}));
    const action = body.action || "start";

    if (action === "stop") {
      // Find active entry and stop it
      const activeList = await db
        .select()
        .from(timeEntries)
        .where(and(eq(timeEntries.userId, user.userId), isNull(timeEntries.endTime)))
        .limit(1);

      if (activeList.length === 0) {
        return NextResponse.json({ error: "No active timer found" }, { status: 400 });
      }

      const active = activeList[0];
      const now = Date.now();
      await db
        .update(timeEntries)
        .set({ endTime: now })
        .where(eq(timeEntries.id, active.id));

      return NextResponse.json({
        success: true,
        entry: { ...active, endTime: now },
      });
    }

    // Action: "start"
    // Close ALL existing active entries for this user in a single query
    const now = Date.now();
    await db
      .update(timeEntries)
      .set({ endTime: now })
      .where(and(eq(timeEntries.userId, user.userId), isNull(timeEntries.endTime)));

    const newEntry = {
      id: crypto.randomUUID(),
      userId: user.userId,
      description: (body.description || "").trim() || null,
      startTime: now,
      endTime: null,
      createdAt: now,
    };

    await db.insert(timeEntries).values(newEntry);

    return NextResponse.json({
      success: true,
      entry: newEntry,
    });
  } catch (error) {
    console.error("Timer POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
