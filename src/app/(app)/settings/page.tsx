import { requireUserWithGroup } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { SettingsPanel } from "./SettingsPanel";

export default async function SettingsPage() {
  const { user, membership } = await requireUserWithGroup();

  const members = await prisma.groupMember.findMany({
    where: { groupId: membership.groupId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="page-shell">
      <h1 className="page-title">メンバー・グループ設定</h1>
      <p className="page-subtitle">
        {membership.role === "admin"
          ? "あなたはこのグループの管理者です。"
          : "グループの設定は管理者のみ変更できます。"}
      </p>
      <SettingsPanel
        initialName={membership.group.name}
        initialInviteCode={membership.group.inviteCode}
        members={members.map((m) => ({
          id: m.id,
          userId: m.userId,
          displayName: m.user.displayName,
          role: m.role,
        }))}
        isAdmin={membership.role === "admin"}
        currentUserId={user.id}
      />
    </div>
  );
}
