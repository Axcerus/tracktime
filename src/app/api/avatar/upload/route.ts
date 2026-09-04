import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { saveAvatar, deleteAvatar } from "@/lib/storage";
import { signSession } from "@/lib/crypto";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function getExtensionFromMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/jpeg":
    default:
      return ".jpg";
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a JPEG, PNG, WebP, or GIF image." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image file exceeds the 10MB size limit." },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Fetch existing user record to clean up previous avatar
    const existingUsers = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1);

    const oldAvatarUrl = existingUsers[0]?.avatarUrl;
    if (oldAvatarUrl && oldAvatarUrl.startsWith("/api/avatar/")) {
      const oldFilename = oldAvatarUrl.replace("/api/avatar/", "");
      if (oldFilename) {
        try {
          await deleteAvatar(oldFilename);
        } catch {
          // Ignore error deleting old file
        }
      }
    }

    const ext = getExtensionFromMime(file.type);
    const filename = `${currentUser.userId}-${Date.now()}${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    await saveAvatar(filename, arrayBuffer, file.type);

    const avatarUrl = `/api/avatar/${filename}`;
    await db
      .update(users)
      .set({ avatarUrl })
      .where(eq(users.id, currentUser.userId));

    const newToken = await signSession({
      userId: currentUser.userId,
      name: currentUser.name,
      email: currentUser.email,
      avatarUrl,
    });

    const response = NextResponse.json({
      success: true,
      avatarUrl,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}

export async function DELETE() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();

    const existingUsers = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, currentUser.userId))
      .limit(1);

    const oldAvatarUrl = existingUsers[0]?.avatarUrl;
    if (oldAvatarUrl && oldAvatarUrl.startsWith("/api/avatar/")) {
      const oldFilename = oldAvatarUrl.replace("/api/avatar/", "");
      if (oldFilename) {
        try {
          await deleteAvatar(oldFilename);
        } catch {
          // Ignore error
        }
      }
    }

    await db
      .update(users)
      .set({ avatarUrl: null })
      .where(eq(users.id, currentUser.userId));

    const newToken = await signSession({
      userId: currentUser.userId,
      name: currentUser.name,
      email: currentUser.email,
      avatarUrl: null,
    });

    const response = NextResponse.json({ success: true, avatarUrl: null });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json({ error: "Failed to remove avatar" }, { status: 500 });
  }
}
