import { NextRequest } from "next/server";
import { getAvatar } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  // Sanitize key against directory traversal
  const sanitizedKey = key.replace(/[^a-zA-Z0-9._-]/g, "");
  const result = await getAvatar(sanitizedKey);
  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.data, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
