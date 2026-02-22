"use client";

import type { WorkflowStep } from "@/types/task";
import { WorkflowStepCard } from "./WorkflowStepCard";

interface WorkflowStepsListProps {
  steps: WorkflowStep[];
  currentUserId: string;
  onStartStep?: (stepId: string) => void;
  onCompleteStep?: (stepId: string, response: string) => void;
}

export function WorkflowStepsList({
  steps,
  currentUserId,
  onStartStep,
  onCompleteStep,
}: WorkflowStepsListProps) {
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-green-500 h-full transition-all duration-500"
          style={{
            width: `${(steps.filter((s) => s.status === "completed").length / steps.length) * 100}%`,
          }}
        />
      </div>

      <p className="text-sm text-gray-500 text-center">
        {steps.filter((s) => s.status === "completed").length} מתוך{" "}
        {steps.length} שלבים הושלמו
      </p>

      {/* Steps */}
      <div className="relative">
        {/* Connector Line */}
        <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-gray-200 z-0" />

        <div className="space-y-4 relative z-10">
          {sortedSteps.map((step) => {
            const isAssigned = step.assignees.some(
              (a) => a.userId === currentUserId,
            );

            return (
              <WorkflowStepCard
                key={step.id}
                step={step}
                isCurrentUser={isAssigned}
                onStart={onStartStep ? () => onStartStep(step.id) : undefined}
                onComplete={
                  onCompleteStep ? (r) => onCompleteStep(step.id, r) : undefined
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
