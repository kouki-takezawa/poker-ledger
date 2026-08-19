import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getFriendIds } from "@/lib/friends";
import { SessionRecorder, type QuickFillOption } from "./SessionRecorder";

export default async function NewSessionPage() {
  const user = await requireUser();

  const friendIds = await getFriendIds(user.id);
  const users = await prisma.user.findMany({
    where: { id: { in: [user.id, ...friendIds] } },
  });
  const byId = new Map(users.map((u) => [u.id, u.displayName]));

  const members = [user.id, ...friendIds]
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .map((id) => ({ id, name: byId.get(id) ?? "?" }));

  const friendIdSet = new Set(friendIds);
  const lastSession = await prisma.session.findFirst({
    where: { createdById: user.id, status: "confirmed" },
    orderBy: { sessionDate: "desc" },
    include: { entries: true },
  });

  let quickFill: QuickFillOption | undefined;
  if (lastSession) {
    const stillValid = lastSession.entries.filter((e) => e.userId === user.id || friendIdSet.has(e.userId));
    if (stillValid.length > 0) {
      quickFill = {
        sessionDate: lastSession.sessionDate.toISOString().slice(0, 10),
        selected: stillValid.map((e) => e.userId),
        entries: Object.fromEntries(
          stillValid.map((e) => [e.userId, { initial: e.initialStake, cashOut: null }])
        ),
      };
    }
  }

  return <SessionRecorder members={members} quickFill={quickFill} />;
}
