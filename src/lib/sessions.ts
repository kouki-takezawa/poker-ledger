import { z } from "zod";
import { getFriendIds } from "@/lib/friends";

export const sessionBodySchema = z.object({
  sessionDate: z.string().min(1),
  location: z.string().trim().max(60).optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  entries: z
    .array(
      z.object({
        userId: z.string().min(1),
        initialStake: z.number().int().min(0),
        cashOut: z.number().int().min(0),
      })
    )
    .min(1, "参加者を選んでください"),
  rebuys: z.array(
    z.object({
      buyerId: z.string().min(1),
      shares: z
        .array(z.object({ sellerId: z.string().min(1), amount: z.number().int().positive() }))
        .min(1),
    })
  ),
});

// Checks that every non-organizer participant is a friend of the organizer,
// and that every rebuy references real participants. Returns an error
// message, or null when the payload is valid.
export async function validateSessionEntries(
  organizerId: string,
  entries: { userId: string }[],
  rebuys: { buyerId: string; shares: { sellerId: string }[] }[]
): Promise<string | null> {
  const participantIds = new Set(entries.map((e) => e.userId));
  const friendIds = new Set(await getFriendIds(organizerId));
  const notFriends = [...participantIds].filter((id) => id !== organizerId && !friendIds.has(id));
  if (notFriends.length > 0) {
    return "参加者に友達登録していない人が含まれています。先に「友達」から追加してください。";
  }
  for (const r of rebuys) {
    if (!participantIds.has(r.buyerId)) return "リバイの買い手が参加者に含まれていません。";
    for (const s of r.shares) {
      if (!participantIds.has(s.sellerId)) return "リバイの売り手が参加者に含まれていません。";
      if (s.sellerId === r.buyerId) return "買い手と売り手が同じ人になっています。";
    }
  }
  return null;
}

// How long after confirming a session its organizer may still edit or delete
// it. Bounded so financial history can't be silently rewritten indefinitely.
export const EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function canEditSession(session: { createdById: string; confirmedAt: Date | null }, userId: string): boolean {
  if (session.createdById !== userId) return false;
  if (!session.confirmedAt) return false;
  return Date.now() - session.confirmedAt.getTime() <= EDIT_WINDOW_MS;
}

// Minutes played, handling a session that rolls past midnight (endedAt <= startedAt).
export function durationMinutes(startedAt: Date | null, endedAt: Date | null): number | null {
  if (!startedAt || !endedAt) return null;
  let ms = endedAt.getTime() - startedAt.getTime();
  if (ms <= 0) ms += 24 * 60 * 60 * 1000;
  return Math.round(ms / 60000);
}

// Combines a "YYYY-MM-DD" session date with an "HH:MM" clock reading into a
// single Date. Not a real timezone-aware instant — like sessionDate itself,
// it's just a UTC-encoded stand-in for "this date, this clock time" so that
// duration math (a plain delta between two such values) comes out right
// regardless of server timezone. Always format it back with the UTC getters.
export function combineDateAndTime(dateStr: string, timeStr: string | undefined | null): Date | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCHours(Number(match[1]), Number(match[2]), 0, 0);
  return d;
}

export function formatTimeUTC(date: Date): string {
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

// Builds startedAt/endedAt for storage, rolling endedAt to the next day if
// it's not after startedAt (a session that runs past midnight).
export function computeStartEnd(
  dateStr: string,
  startTime: string | undefined | null,
  endTime: string | undefined | null
): { startedAt: Date | null; endedAt: Date | null } {
  const startedAt = combineDateAndTime(dateStr, startTime);
  let endedAt = combineDateAndTime(dateStr, endTime);
  if (startedAt && endedAt && endedAt.getTime() <= startedAt.getTime()) {
    endedAt = new Date(endedAt.getTime() + 24 * 60 * 60 * 1000);
  }
  return { startedAt, endedAt };
}
