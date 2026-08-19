import { prisma } from "@/lib/prisma";

export async function getFriendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friendship.findMany({ where: { userId }, select: { friendId: true } });
  return rows.map((r) => r.friendId);
}
