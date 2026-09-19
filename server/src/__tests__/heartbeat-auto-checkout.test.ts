import { describe, expect, it } from "vitest";
import {
  shouldAutoCheckoutIssueForWake,
} from "../services/heartbeat.ts";

describe("shouldAutoCheckoutIssueForWake", () => {
  const executorId = "22222222-2222-4222-8222-222222222222";
  const reviewerId = "11111111-1111-4111-8111-111111111111";
  const changesRequested = {
    status: "changes_requested",
    currentStageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    currentStageIndex: 0,
    currentStageType: "review",
    currentParticipant: { type: "agent", agentId: reviewerId },
    returnAssignee: { type: "agent", agentId: executorId },
    completedStageIds: [],
    lastDecisionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    lastDecisionOutcome: "changes_requested",
  };

  it("checks out policy-authorized rework for the return executor", () => {
    expect(shouldAutoCheckoutIssueForWake({
      contextSnapshot: { wakeReason: "execution_changes_requested",
        executionStage: { wakeRole: "executor", stageType: "review" } },
      issueStatus: "in_progress",
      issueAssigneeAgentId: executorId,
      issueExecutionState: changesRequested,
      isDependencyReady: true,
      agentId: executorId,
    })).toBe(true);
  });

  it.each([
    null,
    { ...changesRequested, status: "pending" },
    { ...changesRequested, returnAssignee: { type: "agent", agentId: reviewerId } },
  ])("does not infer rework authority from a wake reason without matching persisted state (%j)", (state) => {
    expect(shouldAutoCheckoutIssueForWake({
      contextSnapshot: { wakeReason: "execution_changes_requested" },
      issueStatus: "in_progress",
      issueAssigneeAgentId: executorId,
      issueExecutionState: state,
      isDependencyReady: true,
      agentId: executorId,
    })).toBe(false);
  });

  it.each(["execution_review_requested", "execution_approval_requested"])("never treats %s as executor work", (wakeReason) => {
    expect(shouldAutoCheckoutIssueForWake({
      contextSnapshot: { wakeReason },
      issueStatus: "in_progress",
      issueAssigneeAgentId: executorId,
      issueExecutionState: changesRequested,
      isDependencyReady: true,
      agentId: executorId,
    })).toBe(false);
  });

  it("auto-checks out an assigned todo issue for an actionable wake", () => {
    expect(shouldAutoCheckoutIssueForWake({
      contextSnapshot: { wakeReason: "issue_assigned" },
      issueStatus: "todo",
      issueAssigneeAgentId: "agent-1",
      isDependencyReady: true,
      agentId: "agent-1",
    })).toBe(true);
  });

  it("leaves an idle review issue in review without an actionable wake", () => {
    expect(shouldAutoCheckoutIssueForWake({
      contextSnapshot: {},
      issueStatus: "in_review",
      issueAssigneeAgentId: "agent-1",
      isDependencyReady: true,
      agentId: "agent-1",
    })).toBe(false);
  });

  it("does not auto-checkout pending execution-review state even if the row status is todo", () => {
    const reviewerAgentId = "11111111-1111-4111-8111-111111111111";
    const coderAgentId = "22222222-2222-4222-8222-222222222222";
    expect(shouldAutoCheckoutIssueForWake({
      contextSnapshot: { wakeReason: "issue_recovery_action_restored" },
      issueStatus: "todo",
      issueAssigneeAgentId: reviewerAgentId,
      issueExecutionState: {
        status: "pending",
        currentStageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        currentStageIndex: 0,
        currentStageType: "review",
        currentParticipant: { type: "agent", agentId: reviewerAgentId },
        returnAssignee: { type: "agent", agentId: coderAgentId },
        reviewRequest: null,
        completedStageIds: [],
        lastDecisionId: null,
        lastDecisionOutcome: null,
      },
      isDependencyReady: true,
      agentId: reviewerAgentId,
    })).toBe(false);
  });
});
