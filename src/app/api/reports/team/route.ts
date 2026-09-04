import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { users, timeEntries } from "@/db/schema";
import { and, gte, lte, isNull } from "drizzle-orm";

function formatPeriodLabel(period: string, offset: number, startLocal: Date) {
  if (period === "week") {
    if (offset === 0) return "This week";
    if (offset === -1) return "Last week";
    const absOffset = Math.abs(offset);
    return `${absOffset} weeks ago`;
  }

  if (period === "month") {
    if (offset === 0) return "This month";
    if (offset === -1) return "Last month";
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const month = monthNames[startLocal.getUTCMonth()];
    const year = startLocal.getUTCFullYear();
    return `${month} ${year}`;
  }

  // Day
  if (offset === 0) return "Today";
  if (offset === -1) return "Yesterday";
  const absOffset = Math.abs(offset);
  if (absOffset <= 7) return `${absOffset} days ago`;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[startLocal.getUTCMonth()]} ${startLocal.getUTCDate()}`;
}

function getPeriodRange(period: string, offset: number, tzOffsetMinutes: number) {
  const now = new Date();
  const clientLocal = new Date(now.getTime() - tzOffsetMinutes * 60 * 1000);

  const startLocal = new Date(clientLocal);
  let endLocal = new Date(clientLocal);

  if (period === "week") {
    const day = clientLocal.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day;
    startLocal.setUTCDate(clientLocal.getUTCDate() + diff + offset * 7);
    startLocal.setUTCHours(0, 0, 0, 0);

    endLocal = new Date(startLocal);
    endLocal.setUTCDate(startLocal.getUTCDate() + 7);
    endLocal.setUTCMilliseconds(-1);
  } else if (period === "month") {
    startLocal.setUTCMonth(clientLocal.getUTCMonth() + offset, 1);
    startLocal.setUTCHours(0, 0, 0, 0);

    endLocal = new Date(startLocal);
    endLocal.setUTCMonth(startLocal.getUTCMonth() + 1, 1);
    endLocal.setUTCMilliseconds(-1);
  } else {
    // "today" / day
    startLocal.setUTCDate(clientLocal.getUTCDate() + offset);
    startLocal.setUTCHours(0, 0, 0, 0);

    endLocal = new Date(startLocal);
    endLocal.setUTCHours(23, 59, 59, 999);
  }

  const startMs = startLocal.getTime() + tzOffsetMinutes * 60 * 1000;
  const endMs = endLocal.getTime() + tzOffsetMinutes * 60 * 1000;

  const label = formatPeriodLabel(period, offset, startLocal);

  return { startMs, endMs, label };
}

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = req.nextUrl;
    const period = searchParams.get("period") || "today";
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const tzOffset = parseInt(searchParams.get("tzOffset") || "0", 10);

    const { startMs, endMs, label } = getPeriodRange(period, offset, tzOffset);
    const db = await getDb();

    // 1. Fetch all team members
    const allUsers: Array<{ id: string; name: string; email: string; avatarUrl: string | null }> = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(users);

    // 2. Fetch all entries within the period
    const entries: Array<{ id: string; userId: string; startTime: number; endTime: number | null }> = await db
      .select({
        id: timeEntries.id,
        userId: timeEntries.userId,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
      })
      .from(timeEntries)
      .where(
        and(
          gte(timeEntries.startTime, startMs),
          lte(timeEntries.startTime, endMs)
        )
      );

    // 3. Fetch currently active sessions to know who is working right now
    const activeEntries: Array<{ id: string; userId: string; startTime: number }> = await db
      .select({
        id: timeEntries.id,
        userId: timeEntries.userId,
        startTime: timeEntries.startTime,
      })
      .from(timeEntries)
      .where(isNull(timeEntries.endTime));

    const activeUserSet = new Set(activeEntries.map((a) => a.userId));

    // 4. Aggregate by user
    const userStats = new Map<string, { totalDurationMs: number; sessionCount: number }>();
    let teamTotalDurationMs = 0;

    for (const entry of entries) {
      if (entry.endTime) {
        const dur = Math.max(0, entry.endTime - entry.startTime);
        const existing = userStats.get(entry.userId) || { totalDurationMs: 0, sessionCount: 0 };
        existing.totalDurationMs += dur;
        existing.sessionCount += 1;
        userStats.set(entry.userId, existing);
        teamTotalDurationMs += dur;
      }
    }

    // If viewing current period (offset === 0), include live elapsed duration for active members
    if (offset === 0) {
      const nowMs = Date.now();
      for (const live of activeEntries) {
        if (live.startTime >= startMs && live.startTime <= endMs) {
          const liveDur = Math.max(0, nowMs - live.startTime);
          const existing = userStats.get(live.userId) || { totalDurationMs: 0, sessionCount: 0 };
          existing.totalDurationMs += liveDur;
          existing.sessionCount += 1;
          userStats.set(live.userId, existing);
          teamTotalDurationMs += liveDur;
        }
      }
    }

    const teamReport = allUsers.map((u) => {
      const stats = userStats.get(u.id) || { totalDurationMs: 0, sessionCount: 0 };
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        totalDurationMs: stats.totalDurationMs,
        sessionCount: stats.sessionCount,
        isWorkingNow: activeUserSet.has(u.id),
        isMe: u.id === currentUser.userId,
      };
    });

    // Sort descending by logged hours, then by name
    teamReport.sort((a, b) => b.totalDurationMs - a.totalDurationMs || a.name.localeCompare(b.name));

    return NextResponse.json({
      teamReport,
      teamTotalDurationMs,
      period,
      offset,
      label,
      startMs,
      endMs,
    });
  } catch (error) {
    console.error("Reports team GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
