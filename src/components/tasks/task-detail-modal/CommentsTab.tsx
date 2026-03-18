"use client";

import { format } from "date-fns";
import { ClipboardList, ChevronLeft } from "lucide-react";
import type { Task } from "@/types/task";

interface CommentsTabProps {
  task: Task;
  newComment: string;
  onNewCommentChange: (value: string) => void;
  onAddComment: () => void;
}

export function CommentsTab({
  task,
  newComment,
  onNewCommentChange,
  onAddComment,
}: CommentsTabProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onAddComment();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-3 mb-4">
        {task.progressUpdates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-indigo-700">עדכוני התקדמות</p>
            {task.progressUpdates.map((update) => (
              <div key={update.id} className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-indigo-900">{update.userName}</span>
                  <span className="text-xs text-indigo-500">
                    {format(new Date(update.createdAt), "dd/MM HH:mm")}
                  </span>
                </div>
                <p className="text-sm text-indigo-900">{update.text}</p>
                {update.expectedCompletionAt && (
                  <p className="text-xs text-indigo-600 mt-1">
                    יעד סיום מעודכן: {format(new Date(update.expectedCompletionAt), "dd/MM/yyyy HH:mm")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {task.comments.length === 0 && task.progressUpdates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>אין הערות עדיין</p>
          </div>
        ) : (
          task.comments.map((comment) => (
            <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{comment.userName}</span>
                <span className="text-xs text-gray-400">
                  {format(new Date(comment.createdAt), "dd/MM HH:mm")}
                </span>
              </div>
              <p className="text-sm text-gray-700">{comment.text}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => onNewCommentChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="הוסף הערה..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <button
          onClick={onAddComment}
          disabled={!newComment.trim()}
          className="px-3 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
