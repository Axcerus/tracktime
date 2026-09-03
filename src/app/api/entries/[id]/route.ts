import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { timeEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();

  // Verify ownership
  const existing = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, currentUser.userId)))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  try {
    const { startTime, endTime, description } = await req.json();

    const updates: Partial<typeof timeEntries.$inferInsert> = {};

    if (startTime !== undefined) updates.startTime = Number(startTime);
    if (endTime !== undefined) updates.endTime = endTime === null ? null : Number(endTime);
    if (description !== undefined) updates.description = (description || "").trim() || null;

    // Validate end time vs start time using effective values (updated or existing)
    const effectiveStart = updates.startTime ?? existing[0].startTime;
    const effectiveEnd = updates.endTime !== undefined ? updates.endTime : existing[0].endTime;

    if (effectiveEnd !== null && effectiveEnd !== undefined && effectiveEnd <= effectiveStart) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    await db
      .update(timeEntries)
      .set(updates)
      .where(eq(timeEntries.id, id));

    return NextResponse.json({ success: true, updated: updates });
  } catch (error) {
    console.error("Failed to update entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();

  // Verify ownership before deleting
  const existing = await db
    .select({ id: timeEntries.id })
    .from(timeEntries)
    .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, currentUser.userId)))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  await db
    .delete(timeEntries)
    .where(eq(timeEntries.id, id));

  return NextResponse.json({ success: true });
}
