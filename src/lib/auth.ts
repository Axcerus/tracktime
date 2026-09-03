import { cookies } from "next/headers";
import { verifySession, SessionData } from "./crypto";

export const SESSION_COOKIE_NAME = "tracktimer_session";

export async function getCurrentUser(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySession(token);
  } catch {
    return null;
  }
}
