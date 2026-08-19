import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getFriendIds } from "@/lib/friends";
import { canEditSession, formatTimeUTC } from "@/lib/sessions";
import { SessionRecorder, type EditInitial } from "../../new/SessionRecorder";

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const session = await prisma.session.findUnique({
    where: { id },
    include: { entries: true, rebuys: { include: { shares: true } } },
  });

  if (!session || session.createdById !== user.id) notFound();

  if (!canEditSession(session, user.id)) {
    return (
      <div className="page-shell">
        <h1 className="page-title">編集できません</h1>
        <p className="page-subtitle">対局の編集は確定から7日以内のみ可能です。</p>
        <Link href={`/sessions/${id}`} className="ghost" style={{ textDecoration: "none", display: "inline-block" }}>
          対局の詳細に戻る
        </Link>
      </div>
    );
  }

  const friendIds = await getFriendIds(user.id);
  const memberIds = [...new Set([user.id, ...friendIds, ...session.entries.map((e) => e.userId)])];
  const users = await prisma.user.findMany({ where: { id: { in: memberIds } } });
  const nameOf = new Map(users.map((u) => [u.id, u.displayName]));
  const members = memberIds
    .filter((id) => nameOf.has(id))
    .map((id) => ({ id, name: nameOf.get(id)! }));

  const editInitial: EditInitial = {
    id: session.id,
    sessionDate: session.sessionDate.toISOString().slice(0, 10),
    location: session.location ?? "",
    startTime: session.startedAt ? formatTimeUTC(session.startedAt) : "",
    endTime: session.endedAt ? formatTimeUTC(session.endedAt) : "",
    selected: session.entries.map((e) => e.userId),
    entries: Object.fromEntries(
      session.entries.map((e) => [e.userId, { initial: e.initialStake, cashOut: e.cashOut }])
    ),
    rebuys: session.rebuys.map((r, i) => ({
      id: `r${i}`,
      buyerId: r.buyerId,
      shares: r.shares.map((s) => ({ sellerId: s.sellerId, amount: s.amount })),
    })),
  };

  return <SessionRecorder members={members} edit={editInitial} />;
}
