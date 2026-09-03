import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { users, timeEntries } from "@/db/schema";
import { gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();

    // Calculate start of today based on user's timezone
    const tzOffsetParam = req.nextUrl.searchParams.get("tzOffset");
    const tzOffsetMinutes = tzOffsetParam ? parseInt(tzOffsetParam, 10) : 0;

    const now = new Date();
    const clientLocal = new Date(now.getTime() - tzOffsetMinutes * 60 * 1000);
    clientLocal.setUTCHours(0, 0, 0, 0);
    const startOfDayMs = clientLocal.getTime() + tzOffsetMinutes * 60 * 1000;

    // 1. Fetch all team members
    const allUsers: Array<{ id: string; name: string; email: string }> = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users);

    // 2. Fetch all entries from today (including active ones)
    const todayEntries: Array<typeof timeEntries.$inferSelect> = await db
      .select()
      .from(timeEntries)
      .where(gte(timeEntries.startTime, startOfDayMs));

    // 3. Aggregate completed time and find active entry per user
    const userStats = new Map<
      string,
      {
        completedMs: number;
        activeEntry: { startTime: number; description: string | null } | null;
      }
    >();

    for (const u of allUsers) {
      userStats.set(u.id, { completedMs: 0, activeEntry: null });
    }

    const nowMs = Date.now();
    for (const entry of todayEntries) {
      const stats = userStats.get(entry.userId) || { completedMs: 0, activeEntry: null };
      if (entry.endTime) {
        stats.completedMs += Math.max(0, entry.endTime - entry.startTime);
      } else {
        // Currently active
        stats.activeEntry = {
          startTime: entry.startTime,
          description: entry.description,
        };
      }
      userStats.set(entry.userId, stats);
    }

    // 4. Build members list
    let activeCount = 0;
    const members = allUsers.map((u) => {
      const stats = userStats.get(u.id) || { completedMs: 0, activeEntry: null };
      const isWorkingNow = Boolean(stats.activeEntry);
      if (isWorkingNow) activeCount++;

      const currentSessionMs = stats.activeEntry
        ? Math.max(0, nowMs - stats.activeEntry.startTime)
        : 0;

      const totalDurationWorkedMs = stats.completedMs + currentSessionMs;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        isWorkingNow,
        startTime: stats.activeEntry?.startTime || null,
        description: stats.activeEntry?.description || null,
        completedTodayMs: stats.completedMs,
        currentSessionMs,
        totalDurationWorkedMs,
        isMe: u.id === currentUser.userId,
      };
    });

    // Sort by totalDurationWorkedMs descending; if equal, active users first, then by name
    members.sort((a, b) => {
      if (b.totalDurationWorkedMs !== a.totalDurationWorkedMs) {
        return b.totalDurationWorkedMs - a.totalDurationWorkedMs;
      }
      if (b.isWorkingNow !== a.isWorkingNow) {
        return b.isWorkingNow ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      members,
      activeCount,
      currentUserId: currentUser.userId,
    });
  } catch (error) {
    console.error("Team GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
