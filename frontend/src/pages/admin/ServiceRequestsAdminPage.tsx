import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";

import {
  serviceRequestsApi,
  type ServiceRequest,
  type ServiceRequestStatus,
  type ChangeStatusData,
  STATUS_LABELS,
  STATUS_COLORS,
} from "../../api/serviceRequestsApi";

import { authApi } from "../../api/authApi";

import {
  agentWorkflowsApi,
  type AgentWorkflowDetails,

} from "../../api/agentWorkflowsApi";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{
  status: ServiceRequestStatus;
}> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}
  >
    {STATUS_LABELS[status]}
  </span>
);

// Admin allowed transitions
const ADMIN_TRANSITIONS: Partial<
  Record<ServiceRequestStatus, ServiceRequestStatus[]>
> = {
  Submitted: ["InProgress", "Rejected", "Cancelled"],
  InProgress: [
    "AwaitingReview",
    "RevisionRequired",
    "Cancelled",
  ],
  AwaitingReview: [
    "Approved",
    "Rejected",
    "RevisionRequired",
  ],
  RevisionRequired: [
    "InProgress",
    "Cancelled",
  ],
  Approved: ["Completed"],
};

const ALL_STATUSES: ServiceRequestStatus[] = [
  "Submitted",
  "InProgress",
  "AwaitingReview",
  "Approved",
  "Rejected",
  "RevisionRequired",
  "Completed",
  "Cancelled",
];

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export const AdminServiceRequestsPage: React.FC = () => {
  const admin = authApi.getCurrentAdmin();

  const [requests, setRequests] =
    useState<ServiceRequest[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // ───────────────────────────────────────────────────────────
  // Filters
  // ───────────────────────────────────────────────────────────

  const [statusFilter, setStatusFilter] =
    useState<ServiceRequestStatus | "ALL">("ALL");

  const [search, setSearch] = useState("");

  // ───────────────────────────────────────────────────────────
  // Normal Status Change Modal
  // ───────────────────────────────────────────────────────────

  const [changingId, setChangingId] =
    useState<string | null>(null);

  const [newStatus, setNewStatus] =
    useState<ServiceRequestStatus>("InProgress");

  const [note, setNote] = useState("");

  const [changing, setChanging] = useState(false);

  const [changeError, setChangeError] =
    useState<string | null>(null);

  // ───────────────────────────────────────────────────────────
  // AI Workflow Review
  // ───────────────────────────────────────────────────────────

  const [reviewRequest, setReviewRequest] =
  useState<ServiceRequest | null>(null);

const [aiWorkflow, setAiWorkflow] =
  useState<AgentWorkflowDetails | null>(null);

const [aiWorkflowLoading, setAiWorkflowLoading] =
  useState(false);

const [aiWorkflowError, setAiWorkflowError] =
  useState<string | null>(null);

const [approvingAi, setApprovingAi] =
  useState(false);


const [selectedLawyerId, setSelectedLawyerId] =
  useState("");

const [selectedBookingDate, setSelectedBookingDate] =
  useState("");

const [selectedSlotId, setSelectedSlotId] =
  useState("");

  // ───────────────────────────────────────────────────────────
  // Load Requests
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);

      const data =
        await serviceRequestsApi.getAll();

      setRequests(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load requests."
      );
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // Filter
  // ───────────────────────────────────────────────────────────

  const filtered = requests.filter((r) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      r.status === statusFilter;

    const query =
      search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      r.title
        .toLowerCase()
        .includes(query) ||
      r.requestType
        .toLowerCase()
        .includes(query) ||
      r.customerName
        .toLowerCase()
        .includes(query);

    return matchesStatus && matchesSearch;
  });

  // ───────────────────────────────────────────────────────────
  // Normal Status Change
  // ───────────────────────────────────────────────────────────

  const openStatusModal = (
    id: string,
    current: ServiceRequestStatus
  ) => {
    const options =
      ADMIN_TRANSITIONS[current];

    if (!options || options.length === 0) {
      return;
    }

    setChangingId(id);
    setNewStatus(options[0]);
    setNote("");
    setChangeError(null);
  };

  const submitStatusChange = async () => {
    if (!changingId) return;

    try {
      setChanging(true);
      setChangeError(null);

      const data: ChangeStatusData = {
        status: newStatus,
        note: note.trim() || undefined,
      };

      await serviceRequestsApi.changeStatus(
        changingId,
        data,
        admin?.userId
      );

      await fetchAll();

      setChangingId(null);
    } catch (err: any) {
      setChangeError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update status."
      );
    } finally {
      setChanging(false);
    }
  };

  // ───────────────────────────────────────────────────────────
  // AI Workflow
  // ───────────────────────────────────────────────────────────
  const formatPayload = (
  payload?: string | null
) => {
  if (!payload) return "No output available.";

  try {
    return JSON.stringify(
      JSON.parse(payload),
      null,
      2
    );
  } catch {
    return payload;
  }
};








  const openAiWorkflow = async (
  request: ServiceRequest
) => {
  try {
    setReviewRequest(request);
    setAiWorkflow(null);
    setAiWorkflowLoading(true);
    setAiWorkflowError(null);

    // Reset previous selection
    setSelectedLawyerId("");
    setSelectedBookingDate("");
    setSelectedSlotId("");

    // Get all workflows
    const workflows =
      await agentWorkflowsApi.getAll();

    // Find workflow for selected service request
    const matchedWorkflow =
      workflows.find(
        (workflow) =>
          workflow.serviceRequestId ===
          request.serviceRequestId
      );

    if (!matchedWorkflow) {
      setAiWorkflowError(
        "No AI workflow was found for this service request."
      );

      return;
    }

    // Get full workflow details
    const details =
      await agentWorkflowsApi.getById(
        matchedWorkflow.workflowId
      );

    setAiWorkflow(details);

    // ---------------------------------------------------------
    // Prefill appointment data for an already completed workflow
    // ---------------------------------------------------------

    const completedLawyerStep =
      details.steps.find(
        (step) =>
          step.agentName ===
          "LawyerRecommendationAgent"
      ) ?? null;

    if (completedLawyerStep?.outputPayload) {
      try {
        const payload =
          JSON.parse(
            completedLawyerStep.outputPayload
          );

        const existingLawyerId =
          payload.SelectedLawyerId ||
          payload.ApprovedLawyerId ||
          null;

        const existingBookingDate =
          payload.BookingDate ||
          null;

        const existingSlotId =
          payload.SelectedSlotId ||
          null;

        if (existingLawyerId) {
          setSelectedLawyerId(
            existingLawyerId
          );
        }

        if (existingBookingDate) {
          setSelectedBookingDate(
            existingBookingDate
          );
        }

        if (existingSlotId) {
          setSelectedSlotId(
            existingSlotId
          );
        }
      } catch {
        // Ignore malformed/old workflow payload
      }
    }
  } catch (err: any) {
    setAiWorkflowError(
      err.response?.data?.message ||
        err.message ||
        "Failed to load AI workflow."
    );
  } finally {
    setAiWorkflowLoading(false);
  }
};

  

  //Laywer Step
  const lawyerStep =
  aiWorkflow?.steps.find(
    (step) =>
      step.agentName === "LawyerRecommendationAgent"
  ) ?? null;

const schedulingStep =
  aiWorkflow?.steps.find(
    (step) =>
      step.agentName === "SchedulingAgent"
  ) ?? null;

  const parseJsonPayload = (
  payload?: string | null
): any | null => {
  if (!payload) return null;

  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

const lawyerPayload =
  parseJsonPayload(
    lawyerStep?.outputPayload
  );

const schedulingPayload =
  parseJsonPayload(
    schedulingStep?.outputPayload
  );

const recommendedLawyers: any[] =
  lawyerPayload?.Recommendations ?? [];

const selectedLawyerSchedule =
  schedulingPayload?.recommendedLawyers?.find(
    (item: any) =>
      item.lawyerId === selectedLawyerId
  ) ?? null;

const availableDates: any[] =
  selectedLawyerSchedule?.days?.filter(
    (day: any) =>
      Array.isArray(day.availableSlots) &&
      day.availableSlots.length > 0
  ) ?? [];

const selectedDateData =
  availableDates.find(
    (day: any) =>
      day.date === selectedBookingDate
  ) ?? null;

const availableSlots: any[] =
  selectedDateData?.availableSlots ?? [];

const documentationStep =
  aiWorkflow?.steps.find(
    (step) =>
      step.agentName === "DocumentationClerkAgent"
  ) ?? null;

const validationStep =
  aiWorkflow?.steps.find(
    (step) =>
      step.agentName === "PlanningCoordinatorAgent" &&
      step.stepName === "Validate delegated results"
  ) ?? null;

const latestValidation =
  aiWorkflow?.validationResults
    ?.slice()
    .sort(
      (a, b) =>
        new Date(b.checkedAt).getTime() -
        new Date(a.checkedAt).getTime()
    )[0] ?? null;

const validationPassed =
  latestValidation?.passed ?? false;


  //format payload
  









  const closeAiWorkflow = () => {
    setReviewRequest(null);
    setAiWorkflow(null);
    setApprovingAi(false);
  };




const approveAiWorkflow = async () => {
  if (!aiWorkflow) return;

  try {
    setApprovingAi(true);
    setAiWorkflowError(null);

    const requiresLawyer =
      !!lawyerStep;

    if (
      requiresLawyer &&
      !selectedLawyerId
    ) {
      throw new Error(
        "Please select a lawyer."
      );
    }

    if (
      requiresLawyer &&
      !selectedBookingDate
    ) {
      throw new Error(
        "Please select a booking date."
      );
    }

    if (
      requiresLawyer &&
      !selectedSlotId
    ) {
      throw new Error(
        "Please select an appointment slot."
      );
    }

    await agentWorkflowsApi.approve(
      aiWorkflow.workflowId,
      {
        lawyerId:
          requiresLawyer
            ? selectedLawyerId
            : null,

        slotId:
          requiresLawyer
            ? selectedSlotId
            : null,

        bookingDate:
          requiresLawyer
            ? selectedBookingDate
            : null,

        comments:
          "Approved by administrator",
      }
    );

    const refreshed =
      await agentWorkflowsApi.getById(
        aiWorkflow.workflowId
      );

    setAiWorkflow(refreshed);

    await fetchAll();
  } catch (err: any) {
    setAiWorkflowError(
      err.response?.data?.message ||
        err.message ||
        "Failed to approve workflow."
    );
  } finally {
    setApprovingAi(false);
  }
};






const rejectAiWorkflow = async () => {
  if (!aiWorkflow) return;

  const confirmed = window.confirm(
    "Are you sure you want to reject this AI workflow?"
  );

  if (!confirmed) return;

  try {
    setApprovingAi(true);
    setAiWorkflowError(null);

    await agentWorkflowsApi.reject(
      aiWorkflow.workflowId,
      {
        comments: "Rejected by administrator",
      }
    );

    const refreshed =
      await agentWorkflowsApi.getById(
        aiWorkflow.workflowId
      );

    setAiWorkflow(refreshed);

    await fetchAll();
  } catch (err: any) {
    setAiWorkflowError(
      err.response?.data?.message ||
        err.message ||
        "Failed to reject workflow."
    );
  } finally {
    setApprovingAi(false);
  }
};

const reviseAiWorkflow = async () => {
  if (!aiWorkflow) return;

  const confirmed = window.confirm(
    "Are you sure you want to request a revision for this AI workflow?"
  );

  if (!confirmed) return;

  try {
    setApprovingAi(true);
    setAiWorkflowError(null);

    await agentWorkflowsApi.revise(
      aiWorkflow.workflowId,
      {
        comments: "Revision requested by administrator",
      }
    );

    const refreshed =
      await agentWorkflowsApi.getById(
        aiWorkflow.workflowId
      );

    setAiWorkflow(refreshed);

    await fetchAll();
  } catch (err: any) {
    setAiWorkflowError(
      err.response?.data?.message ||
        err.message ||
        "Failed to request workflow revision."
    );
  } finally {
    setApprovingAi(false);
  }
};
 

  // ───────────────────────────────────────────────────────────
  // Status modal derived values
  // ───────────────────────────────────────────────────────────

  const changingRequest =
    changingId
      ? requests.find(
          (r) =>
            r.serviceRequestId ===
            changingId
        )
      : null;

  const availableTransitions =
    changingRequest
      ? ADMIN_TRANSITIONS[
          changingRequest.status as ServiceRequestStatus
        ] ?? []
      : [];

  // ───────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────

  return (
    <AdminLayout
      title="Service Requests"
      subtitle="Manage customer service requests and AI workflow approvals"
    >
      {/* ─────────────────────────────────────────────── */}
      {/* Filters */}
      {/* ─────────────────────────────────────────────── */}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search by title, type, or customer…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target
                .value as ServiceRequestStatus | "ALL"
            )
          }
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">
            All Statuses
          </option>

          {ALL_STATUSES.map((status) => (
            <option
              key={status}
              value={status}
            >
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <button
          onClick={fetchAll}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* ─────────────────────────────────────────────── */}
      {/* Statistics */}
      {/* ─────────────────────────────────────────────── */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(
          [
            "Submitted",
            "InProgress",
            "AwaitingReview",
            "Approved",
          ] as ServiceRequestStatus[]
        ).map((status) => (
          <div
            key={status}
            className="bg-white border border-slate-200 rounded-xl p-4"
          >
            <p className="text-2xl font-bold text-slate-800">
              {
                requests.filter(
                  (r) =>
                    r.status === status
                ).length
              }
            </p>

            <p className="text-xs text-slate-500 mt-0.5">
              {STATUS_LABELS[status]}
            </p>
          </div>
        ))}
      </div>

      {/* ─────────────────────────────────────────────── */}
      {/* Requests Table */}
      {/* ─────────────────────────────────────────────── */}

      {loading ? (
        <div className="text-center py-12 text-slate-500">
          Loading…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No requests found.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Title
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Customer
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Type
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Priority
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Submitted
                </th>

                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((request) => {
                const canChange =
                  !!ADMIN_TRANSITIONS[
                    request.status as ServiceRequestStatus
                  ]?.length;

                return (
                  <tr
                    key={
                      request.serviceRequestId
                    }
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p
                        className="font-medium text-slate-800 truncate max-w-[220px]"
                        title={request.title}
                      >
                        {request.title}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">
                      {request.customerName}
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">
                      {request.requestType}
                    </td>

                    <td className="px-4 py-3.5">
                      {request.priority ? (
                        <span className="text-xs font-medium text-slate-600">
                          {request.priority}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge
                        status={
                          request.status as ServiceRequestStatus
                        }
                      />
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(
                        request.createdAt
                      ).toLocaleDateString(
                        "en-US",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            openAiWorkflow(
                              request
                            )
                          }
                          className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Review AI Workflow
                        </button>

                        {canChange && (
                          <button
                            onClick={() =>
                              openStatusModal(
                                request.serviceRequestId,
                                request.status as ServiceRequestStatus
                              )
                            }
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Change Status
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

     {/* ─────────────────────────────────────────────── */}
    {/* AI Workflow Review Modal */}
    {/* ─────────────────────────────────────────────── */}

    {reviewRequest && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">

          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  AI Workflow Review
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Review the coordinator workflow and specialist agent results.
                </p>
              </div>

              <button
                onClick={closeAiWorkflow}
                className="text-slate-400 hover:text-slate-700 text-xl"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Loading */}
          {aiWorkflowLoading && (
            <div className="p-12 text-center text-slate-500">
              Loading AI workflow...
            </div>
          )}

          {/* Error */}
          {!aiWorkflowLoading && aiWorkflowError && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                {aiWorkflowError}
              </div>
            </div>
          )}

          {/* Real Workflow */}
          {!aiWorkflowLoading &&
            !aiWorkflowError &&
            aiWorkflow && (
              <>
                <div className="p-6 space-y-6">

                  {/* Customer Request */}
                  <div className="border border-slate-200 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-400">
                      Customer Request
                    </p>

                    <h3 className="font-bold text-slate-900 text-lg mt-2">
                      {reviewRequest.title}
                    </h3>

                    <div className="grid sm:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs uppercase text-slate-400">
                          Customer
                        </p>

                        <p className="font-medium text-slate-700 mt-1">
                          {reviewRequest.customerName || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase text-slate-400">
                          Request Type
                        </p>

                        <p className="font-medium text-slate-700 mt-1">
                          {reviewRequest.requestType}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase text-slate-400">
                          Priority
                        </p>

                        <p className="font-medium text-slate-700 mt-1">
                          {reviewRequest.priority || "Normal"}
                        </p>
                      </div>
                    </div>

                    {aiWorkflow.serviceRequest?.description && (
                      <div className="mt-4">
                        <p className="text-xs uppercase text-slate-400">
                          Description
                        </p>

                        <p className="text-sm text-slate-600 mt-1">
                          {aiWorkflow.serviceRequest.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Coordinator */}
                  <div className="border border-purple-200 bg-purple-50 rounded-xl p-5">
                    <div className="flex flex-wrap justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase font-semibold text-purple-500">
                          Planning / Coordinator Agent
                        </p>

                        <p className="font-bold text-purple-900 mt-1 text-lg">
                          Multi-Agent Workflow
                        </p>

                        <p className="text-xs text-purple-600 mt-2 break-all">
                          Workflow ID: {aiWorkflow.workflowId}
                        </p>
                      </div>

                      <div>
                        <span
                          className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold ${
                            aiWorkflow.status === "Completed"
                              ? "bg-green-100 text-green-700"
                              : aiWorkflow.status === "AwaitingApproval"
                              ? "bg-yellow-100 text-yellow-700"
                              : aiWorkflow.status === "Rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {aiWorkflow.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Specialist Agents */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3">
                      Specialist Agent Results
                    </h3>

                    <div className="grid md:grid-cols-3 gap-4">

                      {/* Lawyer */}
                      {lawyerStep && (
                        <div className="border border-slate-200 rounded-xl p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-800">
                                Lawyer Recommendation
                              </p>

                              <p className="text-xs text-slate-400 mt-1">
                                Member 1 Agent
                              </p>
                            </div>

                            <span
                              className={`text-xs font-bold ${
                                lawyerStep.status === "Completed"
                                  ? "text-green-600"
                                  : lawyerStep.status === "Failed"
                                  ? "text-red-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {lawyerStep.status}
                            </span>
                          </div>

                          <pre className="mt-4 text-xs bg-slate-50 rounded-lg p-3 overflow-auto whitespace-pre-wrap break-words max-h-56">
                            {formatPayload(lawyerStep.outputPayload)}
                          </pre>
                        </div>
                      )}

                      {/* Scheduling */}
                      {schedulingStep && (
                        <div className="border border-slate-200 rounded-xl p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-800">
                                Scheduling
                              </p>

                              <p className="text-xs text-slate-400 mt-1">
                                Member 2 Agent
                              </p>
                            </div>

                            <span
                              className={`text-xs font-bold ${
                                schedulingStep.status === "Completed"
                                  ? "text-green-600"
                                  : schedulingStep.status === "Failed"
                                  ? "text-red-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {schedulingStep.status}
                            </span>
                          </div>

                          <pre className="mt-4 text-xs bg-slate-50 rounded-lg p-3 overflow-auto whitespace-pre-wrap break-words max-h-56">
                            {formatPayload(
                              schedulingStep.outputPayload
                            )}
                          </pre>
                        </div>
                      )}

                      {/* Documentation */}
                      {documentationStep && (
                        <div className="border border-slate-200 rounded-xl p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-slate-800">
                                Documentation
                              </p>

                              <p className="text-xs text-slate-400 mt-1">
                                Member 3 Agent
                              </p>
                            </div>

                            <span
                              className={`text-xs font-bold ${
                                documentationStep.status === "Completed"
                                  ? "text-green-600"
                                  : documentationStep.status === "Failed"
                                  ? "text-red-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {documentationStep.status}
                            </span>
                          </div>

                          <pre className="mt-4 text-xs bg-slate-50 rounded-lg p-3 overflow-auto whitespace-pre-wrap break-words max-h-56">
                            {formatPayload(
                              documentationStep.outputPayload
                            )}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>

                  {lawyerStep && (
                  <div className="border border-blue-200 bg-blue-50 rounded-xl p-5">
                    <h3 className="font-bold text-slate-900 mb-4">
                      Appointment Selection
                    </h3>

                    <div className="grid md:grid-cols-3 gap-4">

                      {/* Lawyer */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Lawyer
                        </label>

                        <select
                          value={selectedLawyerId}
                          onChange={(e) => {
                            setSelectedLawyerId(
                              e.target.value
                            );

                            setSelectedBookingDate("");
                            setSelectedSlotId("");
                          }}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
                        >
                          <option value="">
                            Select lawyer
                          </option>

                          {recommendedLawyers.map(
                            (lawyer: any) => (
                              <option
                                key={lawyer.LawyerId}
                                value={lawyer.LawyerId}
                              >
                                {lawyer.FullName} -{" "}
                                {lawyer.PracticeArea}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Booking Date
                        </label>

                        <select
                          value={selectedBookingDate}
                          disabled={!selectedLawyerId}
                          onChange={(e) => {
                            setSelectedBookingDate(
                              e.target.value
                            );

                            setSelectedSlotId("");
                          }}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm disabled:bg-slate-100"
                        >
                          <option value="">
                            Select date
                          </option>

                          {availableDates.map(
                            (day: any) => (
                              <option
                                key={day.date}
                                value={day.date}
                              >
                                {day.date}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {/* Slot */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Time Slot
                        </label>

                        <select
                          value={selectedSlotId}
                          disabled={!selectedBookingDate}
                          onChange={(e) =>
                            setSelectedSlotId(
                              e.target.value
                            )
                          }
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm disabled:bg-slate-100"
                        >
                          <option value="">
                            Select time
                          </option>

                          {availableSlots.map(
                            (slot: any) => (
                              <option
                                key={slot.slotId}
                                value={slot.slotId}
                              >
                                {slot.start} - {slot.end}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                    </div>
                  </div>
                )}

                  {/* All Workflow Steps */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3">
                      Workflow Steps
                    </h3>

                    <div className="space-y-3">
                      {aiWorkflow.steps.map((step) => (
                        <div
                          key={step.stepId}
                          className="border border-slate-200 rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-800">
                                {step.order}. {step.stepName}
                              </p>

                              <p className="text-xs text-slate-500 mt-1">
                                {step.agentName}
                              </p>
                            </div>

                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                step.status === "Completed"
                                  ? "bg-green-100 text-green-700"
                                  : step.status === "Failed"
                                  ? "bg-red-100 text-red-700"
                                  : step.status === "Running"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {step.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Validation */}
                  <div
                    className={`rounded-xl border p-5 ${
                      validationPassed
                        ? "bg-green-50 border-green-200"
                        : latestValidation
                        ? "bg-red-50 border-red-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <p className="text-xs uppercase font-semibold text-slate-500">
                      Coordinator Validation
                    </p>

                    <p
                      className={`font-bold text-lg mt-1 ${
                        validationPassed
                          ? "text-green-700"
                          : latestValidation
                          ? "text-red-700"
                          : "text-slate-700"
                      }`}
                    >
                      {latestValidation
                        ? validationPassed
                          ? "✓ Validation Passed"
                          : "✕ Validation Failed"
                        : "Validation Pending"}
                    </p>

                    {validationStep && (
                      <p className="text-sm text-slate-600 mt-2">
                        Step status: {validationStep.status}
                      </p>
                    )}

                    {latestValidation?.rulesChecked && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-500">
                          Rules Checked
                        </p>

                        <pre className="text-xs mt-1 whitespace-pre-wrap break-words">
                          {formatPayload(
                            latestValidation.rulesChecked
                          )}
                        </pre>
                      </div>
                    )}

                      {latestValidation?.errors &&
                        latestValidation.errors !== "[]" && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-red-600">
                              Validation Errors
                            </p>

                            <pre className="text-xs mt-1 text-red-700 whitespace-pre-wrap break-words">
                              {formatPayload(
                                latestValidation.errors
                              )}
                            </pre>
                          </div>
                        )}


                  </div>

                  {/* Approval Decisions */}
                  {aiWorkflow.approvalDecisions.length > 0 && (
                    <div className="border border-slate-200 rounded-xl p-5">
                      <h3 className="font-bold text-slate-900">
                        Approval Decision
                      </h3>

                      <div className="space-y-3 mt-3">
                        {aiWorkflow.approvalDecisions.map(
                          (decision) => (
                            <div
                              key={decision.decisionId}
                              className="bg-slate-50 rounded-lg p-4"
                            >
                              <p className="font-semibold text-slate-800">
                                {decision.decision}
                              </p>

                              {decision.comments && (
                                <p className="text-sm text-slate-600 mt-1">
                                  {decision.comments}
                                </p>
                              )}

                              <p className="text-xs text-slate-400 mt-2">
                                {new Date(
                                  decision.decidedAt
                                ).toLocaleString()}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Execution Summary */}
                  {aiWorkflow.executionSummary && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                      <p className="text-xs uppercase font-semibold text-green-600">
                        Execution Summary
                      </p>

                      <p className="font-bold text-green-800 mt-1">
                        {aiWorkflow.executionSummary.finalOutcome}
                      </p>

                      <p className="text-xs text-green-600 mt-2">
                        {new Date(
                          aiWorkflow.executionSummary.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 bg-slate-50">
                {aiWorkflow.status === "AwaitingApproval" ? (
                  <div className="flex flex-col sm:flex-row gap-3">

                    <button
                      onClick={approveAiWorkflow}
                      disabled={
                        approvingAi ||
                        !validationPassed
                      }
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl"
                    >
                      {approvingAi
                        ? "Approving..."
                        : "Approve"}
                    </button>

                    <button
                      onClick={rejectAiWorkflow}
                      disabled={approvingAi}
                      className="flex-1 border border-red-200 text-red-700 bg-white hover:bg-red-50 font-semibold py-3 rounded-xl"
                    >
                      Reject
                    </button>

                    <button
                      onClick={reviseAiWorkflow}
                      disabled={approvingAi}
                      className="flex-1 border border-amber-200 text-amber-700 bg-white hover:bg-amber-50 font-semibold py-3 rounded-xl"
                    >
                      Request Revision
                    </button>

                    <button
                      onClick={closeAiWorkflow}
                      disabled={approvingAi}
                      className="px-6 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl disabled:opacity-50"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={closeAiWorkflow}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl"
                  >
                    Close
                  </button>
                )}
              </div>

              </>
            )}
        </div>
      </div>
    )}

      {/* ─────────────────────────────────────────────── */}
      {/* Status Change Modal */}
      {/* ─────────────────────────────────────────────── */}

      {changingId &&
        changingRequest && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Change Request Status
              </h3>

              <p className="text-sm text-slate-500 mb-5 truncate">
                "
                {
                  changingRequest.title
                }
                "
              </p>

              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">
                  Current:{" "}
                  <StatusBadge
                    status={
                      changingRequest.status as ServiceRequestStatus
                    }
                  />
                </p>
              </div>

              {changeError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {changeError}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  New Status
                </label>

                <select
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(
                      e.target
                        .value as ServiceRequestStatus
                    )
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableTransitions.map(
                    (status) => (
                      <option
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {
                          STATUS_LABELS[
                            status
                          ]
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Note
                  (optional)
                </label>

                <textarea
                  value={note}
                  onChange={(e) =>
                    setNote(
                      e.target
                        .value
                    )
                  }
                  rows={3}
                  placeholder="Add a note about this status change…"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={
                    submitStatusChange
                  }
                  disabled={
                    changing
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {changing
                    ? "Updating…"
                    : "Update Status"}
                </button>

                <button
                  onClick={() =>
                    setChangingId(
                      null
                    )
                  }
                  className="flex-1 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-2.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
    </AdminLayout>
  );
};

export default AdminServiceRequestsPage;