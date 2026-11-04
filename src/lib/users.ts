import { prisma } from "@/lib/prisma";

/** Looks up an existing app user by email. Never creates accounts. */
export async function findRegisteredUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  return prisma.user.findFirst({
    where: { email: normalized },
    select: {
      id: true,
      email: true,
      active: true,
      passwordHash: true,
      role: true,
    },
  });
}
