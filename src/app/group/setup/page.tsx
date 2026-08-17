import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { GroupSetupForm } from "./GroupSetupForm";

export default async function GroupSetupPage() {
  const user = await requireUser();

  const membership = await prisma.groupMember.findUnique({ where: { userId: user.id } });
  if (membership) redirect("/");

  return (
    <div className="card" style={{ width: "100%", maxWidth: 420 }}>
      <div className="block">
        <h1 className="page-title" style={{ marginTop: 0 }}>
          グループに参加
        </h1>
        <p className="page-subtitle">
          仲間内のグループを新しく作るか、すでにあるグループの招待コードで参加してください。1人が同時に所属できるグループは1つまでです。
        </p>
        <GroupSetupForm />
      </div>
    </div>
  );
}
