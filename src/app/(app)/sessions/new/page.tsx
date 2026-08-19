import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getFriendIds } from "@/lib/friends";
import { SessionRecorder } from "./SessionRecorder";

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

  return <SessionRecorder members={members} />;
}
