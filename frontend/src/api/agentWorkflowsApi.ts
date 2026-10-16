import { apiClient } from "./apiClient";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AgentWorkflowStatus =
  | "Planning"
  | "Planned"
  | "Running"
  | "AwaitingApproval"
  | "NeedsHumanReview"
  | "Completed"
  | "Rejected";

export interface AgentWorkflowListItem {
  workflowId: string;
  serviceRequestId: string;
  customerId: number | null;
  title: string | null;
  requestType: string | null;
  priority: string | null;
  serviceRequestStatus: string | null;
  status: AgentWorkflowStatus | string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  progressPercentage: number;
  approvalDecision: string | null;
  approvalComments: string | null;
  hasExecutionSummary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentWorkflowStep {
  order: number;
  stepId: string;
  agentName: string;
  stepName: string;
  status: string;
  inputPayload: string;
  outputPayload: string;
  createdAt: string;
}

export interface AgentValidationResult {
  validationId: string;
  workflowId: string;
  rulesChecked: string;
  passed: boolean;
  errors: string;
  checkedAt: string;
}

export interface AgentApprovalDecision {
  decisionId: string;
  workflowId: string;
  approverId: string | number;
  decision: string;
  comments: string | null;
  decidedAt: string;
}

export interface AgentExecutionSummary {
  summaryId: string;
  workflowId: string;
  finalOutcome: string;
  createdAt: string;
}

export interface WorkflowServiceRequest {
  serviceRequestId: string;
  customerId: number;
  title: string;
  description: string;
  requestType: string;
  priority: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentWorkflowDetails {
  workflowId: string;
  serviceRequestId: string;
  status: AgentWorkflowStatus | string;
  createdAt: string;
  updatedAt: string;

  serviceRequest: WorkflowServiceRequest | null;

  steps: AgentWorkflowStep[];

  validationResults: AgentValidationResult[];

  approvalDecisions: AgentApprovalDecision[];

  executionSummary: AgentExecutionSummary | null;
}

export interface ApproveWorkflowData {
  lawyerId?: string | null;
  slotId?: string | null;
  bookingDate?: string | null;
  comments?: string | null;
}

export interface WorkflowCommentData {
  comments?: string | null;
}

export interface WorkflowDecisionResponse {
  workflowId: string;
  status: string;
  serviceRequestStatus: string | null;
  approvalDecision: AgentApprovalDecision | null;
  executionSummary: AgentExecutionSummary | null;
}

// ─── API Functions ──────────────────────────────────────────────────────────

export const agentWorkflowsApi = {
  /**
   * Admin: get all coordinator workflows.
   */
  getAll: async (): Promise<AgentWorkflowListItem[]> => {
    const res = await apiClient.get<AgentWorkflowListItem[]>(
      "/api/agent-workflows"
    );

    return res.data;
  },

  /**
   * Get one workflow with steps, validation,
   * approvals and execution summary.
   */
  getById: async (
    workflowId: string
  ): Promise<AgentWorkflowDetails> => {
    const res = await apiClient.get<AgentWorkflowDetails>(
      `/api/agent-workflows/${workflowId}`
    );

    return res.data;
  },

  /**
   * Admin: approve workflow.
   *
   * Documentation-only workflows can send null
   * lawyerId, slotId and bookingDate.
   */
  approve: async (
    workflowId: string,
    data: ApproveWorkflowData
  ): Promise<WorkflowDecisionResponse> => {
    const res = await apiClient.post<WorkflowDecisionResponse>(
      `/api/agent-workflows/${workflowId}/approve`,
      data
    );

    return res.data;
  },

  /**
   * Admin: reject workflow.
   */
  reject: async (
    workflowId: string,
    data: WorkflowCommentData
  ): Promise<WorkflowDecisionResponse> => {
    const res = await apiClient.post<WorkflowDecisionResponse>(
      `/api/agent-workflows/${workflowId}/reject`,
      data
    );

    return res.data;
  },

  /**
   * Admin: request workflow revision.
   */
  revise: async (
    workflowId: string,
    data: WorkflowCommentData
  ): Promise<WorkflowDecisionResponse> => {
    const res = await apiClient.post<WorkflowDecisionResponse>(
      `/api/agent-workflows/${workflowId}/revise`,
      data
    );

    return res.data;
  },
};