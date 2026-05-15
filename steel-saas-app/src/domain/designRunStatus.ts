export const designRunStatuses = [
  "draft",
  "calculating",
  "complete",
  "failed",
  "superseded",
] as const;

export type DesignRunStatus = (typeof designRunStatuses)[number];

const allowedTransitions: Record<DesignRunStatus, DesignRunStatus[]> = {
  draft: ["calculating"],
  calculating: ["complete", "failed"],
  complete: ["calculating", "superseded"],
  failed: ["calculating", "superseded"],
  superseded: [],
};

export function canTransitionDesignRunStatus(
  from: DesignRunStatus,
  to: DesignRunStatus,
): boolean {
  return allowedTransitions[from].includes(to);
}
