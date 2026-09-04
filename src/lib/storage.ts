import type { R2Bucket } from "@cloudflare/workers-types";

async function getR2Bucket(): Promise<R2Bucket | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx?.env as { AVATARS_BUCKET?: R2Bucket } | undefined;
    if (env?.AVATARS_BUCKET) {
      return env.AVATARS_BUCKET;
    }
  } catch {
    // Cloudflare context unavailable (e.g. running in standard Node.js dev server)
  }
  return null;
}

export async function saveAvatar(
  filename: string,
  data: ArrayBuffer | Uint8Array,
  contentType: string
): Promise<void> {
  const bucket = await getR2Bucket();
  if (bucket) {
    await bucket.put(filename, data, {
      httpMetadata: { contentType },
    });
    return;
  }

  // Local filesystem fallback for Node.js development
  const fs = await import("fs/promises");
  const path = await import("path");
  const uploadDir = path.resolve(process.cwd(), ".uploads", "avatars");
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, path.basename(filename));
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  await fs.writeFile(filePath, Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength));
}

export async function getAvatar(
  filename: string
): Promise<{ data: BodyInit; contentType: string } | null> {
  const bucket = await getR2Bucket();
  if (bucket) {
    const obj = await bucket.get(filename);
    if (!obj) return null;
    return {
      data: obj.body as unknown as BodyInit,
      contentType: obj.httpMetadata?.contentType || "image/jpeg",
    };
  }

  // Local filesystem fallback for Node.js development
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const uploadDir = path.resolve(process.cwd(), ".uploads", "avatars");
    const filePath = path.join(uploadDir, path.basename(filename));
    const buffer = await fs.readFile(filePath);

    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
    };

    return {
      data: new Uint8Array(buffer),
      contentType: mimeMap[ext] || "image/jpeg",
    };
  } catch {
    return null;
  }
}

export async function deleteAvatar(filename: string): Promise<void> {
  const bucket = await getR2Bucket();
  if (bucket) {
    await bucket.delete(filename);
    return;
  }

  // Local filesystem fallback for Node.js development
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const uploadDir = path.resolve(process.cwd(), ".uploads", "avatars");
    const filePath = path.join(uploadDir, path.basename(filename));
    await fs.unlink(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
}
