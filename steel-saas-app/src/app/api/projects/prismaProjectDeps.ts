import { prisma } from "../../../lib/prisma";
import type { ProjectHandlerDeps } from "./handler";

const PROJECT_SELECT = {
  id: true,
  organizationId: true,
  name: true,
  client: true,
  location: true,
  codeProfile: true,
  unitSystem: true,
  createdAt: true,
  archivedAt: true,
} as const;

export function buildProjectDeps(subscriptionStatus: string | null): ProjectHandlerDeps {
  return {
    subscriptionStatus,

    createProject: async (data) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).project.create({ data, select: PROJECT_SELECT }),

    listProjects: async (organizationId) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).project.findMany({
        where: { organizationId, archivedAt: null },
        orderBy: { createdAt: "desc" },
        select: PROJECT_SELECT,
      }),

    findProject: async (id, organizationId) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).project.findFirst({
        where: { id, organizationId },
        select: PROJECT_SELECT,
      }),

    patchProject: async (id, organizationId, data) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = prisma as any;
      const existing = await p.project.findFirst({
        where: { id, organizationId, archivedAt: null },
        select: { id: true },
      });
      if (!existing) return null;
      return p.project.update({ where: { id }, data, select: PROJECT_SELECT });
    },

    archiveProject: async (id, organizationId) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = prisma as any;
      const existing = await p.project.findFirst({
        where: { id, organizationId, archivedAt: null },
        select: { id: true },
      });
      if (!existing) return null;
      return p.project.update({
        where: { id },
        data: { archivedAt: new Date() },
        select: PROJECT_SELECT,
      });
    },
  };
}
