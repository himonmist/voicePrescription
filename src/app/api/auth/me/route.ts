import { handle } from "@/lib/api/handler";
import { apiOpts } from "@/lib/api/common";

export const GET = handle(apiOpts(), async ({ actor }) => Response.json({ userId: actor.userId, role: actor.role, orgId: actor.orgId }));
