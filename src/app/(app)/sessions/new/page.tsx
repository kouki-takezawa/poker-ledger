import { requireUserWithGroup } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { SessionRecorder } from "./SessionRecorder";

export default async function NewSessionPage() {
  const { membership } = await requireUserWithGroup();

  const members = await prisma.groupMember.findMany({
    where: { groupId: membership.groupId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <SessionRecorder
      members={members.map((m) => ({ id: m.userId, name: m.user.displayName }))}
    />
  );
}
