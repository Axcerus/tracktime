import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { timeEntries, users } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

function getPeriodRange(period: string, tzOffsetMinutes: number) {
  const now = new Date();
  // Adjust to client local time
  const clientLocal = new Date(now.getTime() - tzOffsetMinutes * 60 * 1000);

  const startLocal = new Date(clientLocal);
  let endLocal = new Date(clientLocal);

  if (period === "week") {
    // Week starting Monday
    const day = clientLocal.getUTCDay(); // 0 is Sunday, 1 is Monday
    const diff = (day === 0 ? -6 : 1) - day;
    startLocal.setUTCDate(clientLocal.getUTCDate() + diff);
    startLocal.setUTCHours(0, 0, 0, 0);

    endLocal = new Date(startLocal);
    endLocal.setUTCDate(startLocal.getUTCDate() + 7);
    endLocal.setUTCMilliseconds(-1);
  } else if (period === "month") {
    startLocal.setUTCDate(1);
    startLocal.setUTCHours(0, 0, 0, 0);

    endLocal = new Date(startLocal);
    endLocal.setUTCMonth(startLocal.getUTCMonth() + 1);
    endLocal.setUTCDate(1);
    endLocal.setUTCMilliseconds(-1);
  } else {
    // "today" (default)
    startLocal.setUTCHours(0, 0, 0, 0);
    endLocal.setUTCHours(23, 59, 59, 999);
  }

  // Convert back to UTC epoch ms
  const startMs = startLocal.getTime() + tzOffsetMinutes * 60 * 1000;
  const endMs = endLocal.getTime() + tzOffsetMinutes * 60 * 1000;

  return { startMs, endMs };
}

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = req.nextUrl;
    const period = searchParams.get("period") || "today";
    const filter = searchParams.get("filter") || "me";
    const tzOffset = parseInt(searchParams.get("tzOffset") || "0", 10);

    const { startMs, endMs } = getPeriodRange(period, tzOffset);

    const db = await getDb();

    const queryConditions = [
      gte(timeEntries.startTime, startMs),
      lte(timeEntries.startTime, endMs),
    ];

    if (filter === "me") {
      queryConditions.push(eq(timeEntries.userId, currentUser.userId));
    }

    const results = await db
      .select({
        id: timeEntries.id,
        userId: timeEntries.userId,
        userName: users.name,
        userEmail: users.email,
        description: timeEntries.description,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        createdAt: timeEntries.createdAt,
      })
      .from(timeEntries)
      .innerJoin(users, eq(timeEntries.userId, users.id))
      .where(and(...queryConditions))
      .orderBy(desc(timeEntries.startTime));

    interface EntryRow {
      id: string;
      userId: string;
      userName: string;
      userEmail: string;
      description: string | null;
      startTime: number;
      endTime: number | null;
      createdAt: number;
    }

    let totalDurationMs = 0;
    const mappedEntries = (results as EntryRow[]).map((entry) => {
      const durationMs = entry.endTime ? Math.max(0, entry.endTime - entry.startTime) : 0;
      if (entry.endTime) {
        totalDurationMs += durationMs;
      }
      return {
        ...entry,
        durationMs,
        isActive: entry.endTime === null,
      };
    });

    return NextResponse.json({
      entries: mappedEntries,
      totalDurationMs,
      period,
      startMs,
      endMs,
    });
  } catch (error) {
    console.error("Entries GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { startTime, endTime, description } = await req.json();

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: "Start time and end time are required" },
        { status: 400 }
      );
    }

    if (endTime <= startTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const id = crypto.randomUUID();
    const now = Date.now();

    const newEntry = {
      id,
      userId: currentUser.userId,
      description: (description || "").trim() || null,
      startTime: Number(startTime),
      endTime: Number(endTime),
      createdAt: now,
    };

    await db.insert(timeEntries).values(newEntry);

    return NextResponse.json({
      success: true,
      entry: newEntry,
    });
  } catch (error) {
    console.error("Failed to create entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
