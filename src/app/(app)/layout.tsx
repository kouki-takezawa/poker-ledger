import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { friendCode: true } });

  return (
    <AppShell friendCode={me.friendCode} displayName={user.name ?? ""}>
      {children}
    </AppShell>
  );
}
