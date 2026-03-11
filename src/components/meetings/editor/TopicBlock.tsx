"use client";

import { useRef } from "react";
import type { TopicBlock as TopicBlockType, ContentRow, EditorUser, RowType } from "./types";
import RowBlock from "./RowBlock";
import { AddRowBar } from "./BlockToolbar";

interface TopicBlockProps {
  topic: TopicBlockType;
  users: EditorUser[];
  readonly?: boolean;
  canDelete: boolean;
  onTitleChange: (title: string) => void;
  onDelete: () => void;
  onAddRow: (type: RowType, afterRowId?: string) => void;
  onUpdateRow: (rowId: string, updates: Partial<ContentRow>) => void;
  onDeleteRow: (rowId: string) => void;
  onChangeRowType: (rowId: string, newType: RowType) => void;
  onRequestTaskEdit: (rowId: string) => void;
  onRequestConvert: (rowId: string, targetType: "decision" | "task") => void;
}

export default function TopicBlock({
  topic,
  users,
  readonly = false,
  canDelete,
  onTitleChange,
  onDelete,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  onChangeRowType,
  onRequestTaskEdit,
  onRequestConvert,
}: TopicBlockProps) {
  const titleRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Topic header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 border-b border-indigo-100">
        <span className="text-base flex-shrink-0">📋</span>
        {readonly ? (
          <h3 className="flex-1 text-sm font-bold text-indigo-900">
            {topic.title}
          </h3>
        ) : (
          <input
            ref={titleRef}
            type="text"
            value={topic.title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="שם הנושא..."
            dir="rtl"
            className="flex-1 bg-transparent text-sm font-bold text-indigo-900 focus:outline-none placeholder:text-indigo-300"
          />
        )}
        {!readonly && canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-indigo-300 hover:text-red-400 transition-colors text-sm flex-shrink-0"
            aria-label="מחק נושא"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Rows */}
      <div className="px-3 py-3 space-y-2">
        {topic.rows.map((row) => (
          <RowBlock
            key={row.id}
            row={row}
            topicId={topic.id}
            users={users}
            readonly={readonly}
            onUpdate={(updates) => onUpdateRow(row.id, updates)}
            onDelete={() => onDeleteRow(row.id)}
            onAddAfter={(type) => onAddRow(type, row.id)}
            onChangeType={(newType) => onChangeRowType(row.id, newType)}
            onRequestTaskEdit={() => onRequestTaskEdit(row.id)}
            onRequestConvert={(targetType) => onRequestConvert(row.id, targetType)}
          />
        ))}
      </div>

      {/* Add row bar (desktop) */}
      {!readonly && (
        <div className="px-3 pb-3">
          <AddRowBar onAdd={(type) => onAddRow(type)} />
        </div>
      )}
    </div>
  );
}
