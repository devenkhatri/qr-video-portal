import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';

/** True when the request carries a valid admin session cookie. */
export async function isAdminRequest(): Promise<boolean> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  return Boolean(session.isAdmin);
}
