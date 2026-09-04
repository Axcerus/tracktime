import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { users, timeEntries } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";

function pad(num: number): string {
  return num.toString().padStart(2, "0");
}

function getWeekLabel(offset: number) {
  if (offset === 0) return "This week";
  if (offset === -1) return "Last week";
  return `${Math.abs(offset)} weeks ago`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();

  // Find user
  const userList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (userList.length === 0) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const member = userList[0];

  // Check if currently working
  const activeEntries = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, id), isNull(timeEntries.endTime)))
    .limit(1);

  const isWorkingNow = activeEntries.length > 0;

  // Fetch all completed entries for this member
  const allEntries = (await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.userId, id))
    .orderBy(desc(timeEntries.startTime))) as Array<typeof timeEntries.$inferSelect>;

  // Timezone calculations
  const tzOffsetParam = req.nextUrl.searchParams.get("tzOffset");
  const tzOffsetMinutes = tzOffsetParam ? parseInt(tzOffsetParam, 10) : 0;
  const weekOffsetParam = req.nextUrl.searchParams.get("weekOffset");
  const weekOffset = weekOffsetParam ? parseInt(weekOffsetParam, 10) : 0;
  const monthOffsetParam = req.nextUrl.searchParams.get("monthOffset");
  const monthOffset = monthOffsetParam ? parseInt(monthOffsetParam, 10) : 0;

  const now = new Date();
  const clientLocal = new Date(now.getTime() - tzOffsetMinutes * 60 * 1000);

  const startOfTodayLocal = new Date(clientLocal);
  startOfTodayLocal.setUTCHours(0, 0, 0, 0);
  const startOfTodayMs = startOfTodayLocal.getTime() + tzOffsetMinutes * 60 * 1000;

  const currentDay = clientLocal.getUTCDay();
  const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
  const startOfWeekLocal = new Date(clientLocal);
  startOfWeekLocal.setUTCDate(clientLocal.getUTCDate() + diffToMonday);
  startOfWeekLocal.setUTCHours(0, 0, 0, 0);
  const startOfWeekMs = startOfWeekLocal.getTime() + tzOffsetMinutes * 60 * 1000;

  const startOfMonthLocal = new Date(clientLocal);
  startOfMonthLocal.setUTCDate(1);
  startOfMonthLocal.setUTCHours(0, 0, 0, 0);
  const startOfMonthMs = startOfMonthLocal.getTime() + tzOffsetMinutes * 60 * 1000;

  let totalAllTimeMs = 0;
  let totalMonthMs = 0;
  let totalWeekMs = 0;
  let totalTodayMs = 0;

  for (const entry of allEntries) {
    if (entry.endTime) {
      const dur = Math.max(0, entry.endTime - entry.startTime);
      totalAllTimeMs += dur;

      if (entry.startTime >= startOfMonthMs) totalMonthMs += dur;
      if (entry.startTime >= startOfWeekMs) totalWeekMs += dur;
      if (entry.startTime >= startOfTodayMs) totalTodayMs += dur;
    }
  }

  // Include active session duration in today's and all-time totals
  if (isWorkingNow && activeEntries[0]) {
    const liveDur = Math.max(0, now.getTime() - activeEntries[0].startTime);
    totalAllTimeMs += liveDur;
    totalMonthMs += liveDur;
    totalWeekMs += liveDur;
    totalTodayMs += liveDur;
  }

  // Calculate daily stats for 7 days based on weekOffset (0 = current 7 days ending today)
  const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const daysMap = new Map<string, { durationMs: number; sessionCount: number }>();
  const dailyStats: Array<{
    dateKey: string;
    dayName: string;
    shortDate: string;
    durationMs: number;
    sessionCount: number;
    isToday: boolean;
  }> = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - tzOffsetMinutes * 60 * 1000);
    d.setUTCDate(d.getUTCDate() - i + weekOffset * 7);
    const dateKey = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    daysMap.set(dateKey, { durationMs: 0, sessionCount: 0 });
    dailyStats.push({
      dateKey,
      dayName: daysShort[d.getUTCDay()],
      shortDate: `${monthsShort[d.getUTCMonth()]} ${d.getUTCDate()}`,
      durationMs: 0,
      sessionCount: 0,
      isToday: weekOffset === 0 && i === 0,
    });
  }

  for (const entry of allEntries) {
    if (entry.endTime) {
      const entryDate = new Date(entry.startTime - tzOffsetMinutes * 60 * 1000);
      const dateKey = `${entryDate.getUTCFullYear()}-${pad(entryDate.getUTCMonth() + 1)}-${pad(entryDate.getUTCDate())}`;
      if (daysMap.has(dateKey)) {
        const slot = daysMap.get(dateKey)!;
        const dur = Math.max(0, entry.endTime - entry.startTime);
        slot.durationMs += dur;
        slot.sessionCount += 1;
      }
    }
  }

  // Add live session to today slot if active and in current week
  if (isWorkingNow && activeEntries[0] && weekOffset === 0) {
    const todaySlot = dailyStats[dailyStats.length - 1];
    if (todaySlot && daysMap.has(todaySlot.dateKey)) {
      const liveDur = Math.max(0, now.getTime() - activeEntries[0].startTime);
      daysMap.get(todaySlot.dateKey)!.durationMs += liveDur;
    }
  }

  for (const stat of dailyStats) {
    const data = daysMap.get(stat.dateKey);
    if (data) {
      stat.durationMs = data.durationMs;
      stat.sessionCount = data.sessionCount;
    }
  }

  // Up to 100 recent entries for filtering
  const recentEntries = allEntries
    .slice(0, 100)
    .map((e) => ({
      id: e.id,
      description: e.description,
      startTime: e.startTime,
      endTime: e.endTime,
      durationMs: e.endTime
        ? Math.max(0, e.endTime - e.startTime)
        : Math.max(0, now.getTime() - e.startTime),
      isActive: e.endTime === null,
    }));

  // Calculate selected week boundaries for session filtering
  const selectedWeekStartLocal = new Date(clientLocal);
  selectedWeekStartLocal.setUTCDate(clientLocal.getUTCDate() - 6 + weekOffset * 7);
  selectedWeekStartLocal.setUTCHours(0, 0, 0, 0);
  const selectedWeekStartMs = selectedWeekStartLocal.getTime() + tzOffsetMinutes * 60 * 1000;

  const selectedWeekEndLocal = new Date(selectedWeekStartLocal);
  selectedWeekEndLocal.setUTCDate(selectedWeekStartLocal.getUTCDate() + 7);
  selectedWeekEndLocal.setUTCMilliseconds(-1);
  const selectedWeekEndMs = selectedWeekEndLocal.getTime() + tzOffsetMinutes * 60 * 1000;

  // --- Monthly Activity & Streak Calendar ---
  const targetMonthDate = new Date(Date.UTC(clientLocal.getUTCFullYear(), clientLocal.getUTCMonth() + monthOffset, 1));
  const targetYear = targetMonthDate.getUTCFullYear();
  const targetMonth = targetMonthDate.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  const firstDayRaw = new Date(Date.UTC(targetYear, targetMonth, 1)).getUTCDay();
  // Monday start: Mon=0, Tue=1, ..., Sun=6
  const leadingBlankDays = (firstDayRaw === 0 ? 7 : firstDayRaw) - 1;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const targetMonthLabel = `${monthNames[targetMonth]} ${targetYear}`;

  // Aggregate time entries into daily buckets
  const monthDailyMap = new Map<string, number>();
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${targetYear}-${pad(targetMonth + 1)}-${pad(d)}`;
    monthDailyMap.set(key, 0);
  }

  const allDaysMap = new Map<string, number>();
  for (const entry of allEntries) {
    const entryLocal = new Date(entry.startTime - tzOffsetMinutes * 60 * 1000);
    const key = `${entryLocal.getUTCFullYear()}-${pad(entryLocal.getUTCMonth() + 1)}-${pad(entryLocal.getUTCDate())}`;
    const dur = entry.endTime
      ? Math.max(0, entry.endTime - entry.startTime)
      : Math.max(0, now.getTime() - entry.startTime);

    allDaysMap.set(key, (allDaysMap.get(key) || 0) + dur);
    if (monthDailyMap.has(key)) {
      monthDailyMap.set(key, (monthDailyMap.get(key) || 0) + dur);
    }
  }

  const TARGET_DAILY_MS = 3 * 3600 * 1000; // 3 hours daily streak threshold
  const todayKey = `${clientLocal.getUTCFullYear()}-${pad(clientLocal.getUTCMonth() + 1)}-${pad(clientLocal.getUTCDate())}`;
  let starredDaysCount = 0;

  const calendarDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${targetYear}-${pad(targetMonth + 1)}-${pad(d)}`;
    const durationMs = monthDailyMap.get(key) || 0;
    const isToday = key === todayKey;
    const isFuture = key > todayKey;
    const targetMet = durationMs >= TARGET_DAILY_MS;

    if (targetMet) starredDaysCount++;

    calendarDays.push({
      dayNumber: d,
      dateKey: key,
      durationMs,
      targetMet,
      isToday,
      isFuture,
    });
  }

  // --- Streak Calculation with Weekend Grace & Any-Day Bonus ---
  // Any day (Mon-Sun) where 3h is completed counts towards the streak.
  // Weekends (Saturday & Sunday) are normal rest days: if not worked (or < 3h), they do NOT break the streak!
  let currentStreak = 0;
  const todayDur = allDaysMap.get(todayKey) || 0;
  const checkDate = new Date(clientLocal);

  if (todayDur >= TARGET_DAILY_MS) {
    // Today was completed! Adds to streak
    currentStreak = 1;
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  } else {
    // Today not yet completed: check backwards from yesterday
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }

  // Walk backwards up to 365 days
  let safetyLimit = 365;
  while (safetyLimit-- > 0) {
    const key = `${checkDate.getUTCFullYear()}-${pad(checkDate.getUTCMonth() + 1)}-${pad(checkDate.getUTCDate())}`;
    const dur = allDaysMap.get(key) || 0;
    const dayOfWeek = checkDate.getUTCDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (dur >= TARGET_DAILY_MS) {
      // Completed 3h target on this day (weekday or weekend!) -> counts towards streak
      currentStreak++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else if (isWeekend) {
      // Weekend day with < 3h: Normal team rest day, does NOT break the streak!
      // Step across the weekend to check preceding day
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else {
      // Missed a required weekday (< 3h) -> streak ends
      break;
    }
  }

  const calendar = {
    monthOffset,
    monthLabel: targetMonthLabel,
    year: targetYear,
    month: targetMonth,
    leadingBlankDays,
    totalDays: daysInMonth,
    days: calendarDays,
    stats: {
      starredDaysCount,
      currentStreak,
      targetDailyMs: TARGET_DAILY_MS,
    },
  };

  return NextResponse.json({
    member: {
      ...member,
      isWorkingNow,
      isMe: member.id === currentUser.userId,
      stats: {
        totalAllTimeMs,
        totalMonthMs,
        totalWeekMs,
        totalTodayMs,
        completedSessionCount: allEntries.length,
      },
      timeBoundaries: {
        startOfTodayMs,
        startOfWeekMs,
        startOfMonthMs,
        selectedWeekStartMs,
        selectedWeekEndMs,
      },
      dailyStats,
      calendar,
      weekOffset,
      weekLabel: getWeekLabel(weekOffset),
      recentEntries,
    },
  });
}
