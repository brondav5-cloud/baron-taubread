"use client";

import { useState } from "react";
import type { WorkflowStepComment } from "@/types/task";

interface StepCommentsProps {
  comments: WorkflowStepComment[];
  canAdd: boolean;
  onAdd: (text: string) => void;
}

export function StepComments({ comments, canAdd, onAdd }: StepCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAdd = () => {
    if (newComment.trim()) {
      onAdd(newComment.trim());
      setNewComment("");
    }
  };

  if (comments.length === 0 && !canAdd) {
    return null;
  }

  return (
    <div className="mt-3 border-t pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        💬 הערות ({comments.length})
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {/* Existing Comments */}
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {comment.userName}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(comment.createdAt).toLocaleDateString("he-IL", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-600">{comment.text}</p>
            </div>
          ))}

          {/* Add Comment */}
          {canAdd && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="הוסף הערה..."
                className="flex-1 px-2 py-1.5 text-sm border rounded-lg"
              />
              <button
                onClick={handleAdd}
                disabled={!newComment.trim()}
                className="px-2 py-1.5 bg-primary-600 text-white rounded-lg disabled:opacity-50 text-sm"
              >
                שלח
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
