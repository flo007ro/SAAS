import type { DesignRunStatus } from "./designRunStatus";
import type { DesignResult } from "./resultContract";

export type SynchronousDesignRunResponse = {
  id: string;
  status: DesignRunStatus;
  resultJson: DesignResult;
};

export function createSynchronousDesignRunResponse(
  response: SynchronousDesignRunResponse,
): SynchronousDesignRunResponse {
  return response;
}
