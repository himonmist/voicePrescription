import { db } from "@/lib/db";
import type { UserRepo } from "./accounts";

export const prismaUsers: UserRepo = {
  async findByEmail(email) {
    const u = await db().user.findUnique({ where: { email } });
    if (!u || !u.passwordHash) return null; // accounts without a password (e.g. SSO-provisioned) can't use password login
    return { id: u.id, email: u.email, name: u.name, passwordHash: u.passwordHash, role: u.role, orgId: u.orgId };
  },
  async create(input) {
    const u = await db().user.create({ data: { email: input.email, name: input.name ?? null, passwordHash: input.passwordHash, role: "USER" } });
    return { id: u.id, email: u.email, name: u.name, passwordHash: input.passwordHash, role: u.role, orgId: u.orgId };
  },
};
