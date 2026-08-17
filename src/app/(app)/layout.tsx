import { requireUserWithGroup } from "@/lib/auth-helpers";
import { AppShell } from "@/components/AppShell";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { user, membership } = await requireUserWithGroup();

  return (
    <AppShell groupName={membership.group.name} displayName={user.name ?? ""}>
      {children}
    </AppShell>
  );
}
