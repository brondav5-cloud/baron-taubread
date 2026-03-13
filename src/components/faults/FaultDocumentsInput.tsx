"use client";

import { useRef, useState } from "react";
import { Paperclip, X, Loader2, FileText, FileSpreadsheet, File } from "lucide-react";
import {
  uploadFaultDocument,
  deleteFaultDocument,
  type FaultDocument,
} from "@/lib/supabase/faults.queries";

const ACCEPTED =
  ".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv";

const MAX_SIZE_MB = 10;
const MAX_DOCS = 5;

function getFileIcon(type: string) {
  if (type === "application/pdf" || type.includes("pdf"))
    return <FileText className="w-4 h-4 text-red-500" />;
  if (type.includes("word") || type.includes("document"))
    return <FileText className="w-4 h-4 text-blue-500" />;
  if (type.includes("excel") || type.includes("spreadsheet") || type.includes("csv"))
    return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  return <File className="w-4 h-4 text-gray-500" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FaultDocumentsInputProps {
  documents: FaultDocument[];
  companyId: string;
  sessionId: string;
  onDocumentsChange: (docs: FaultDocument[]) => void;
}

export function FaultDocumentsInput({
  documents,
  companyId,
  sessionId,
  onDocumentsChange,
}: FaultDocumentsInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (documents.length >= MAX_DOCS) {
      setError(`מקסימום ${MAX_DOCS} מסמכים`);
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`הקובץ גדול מדי (מקס ${MAX_SIZE_MB}MB)`);
      return;
    }

    setError(null);
    setUploading(true);
    const doc = await uploadFaultDocument(file, companyId, sessionId);
    setUploading(false);

    if (!doc) {
      setError("ההעלאה נכשלה, נסה שוב");
      return;
    }
    onDocumentsChange([...documents, doc]);
  };

  const handleRemove = async (doc: FaultDocument) => {
    onDocumentsChange(documents.filter((d) => d.path !== doc.path));
    await deleteFaultDocument(doc.path);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          מסמכים מצורפים (עד {MAX_DOCS})
        </label>
        <span className="text-sm text-gray-500">
          {documents.length}/{MAX_DOCS}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleFileChange}
        className="hidden"
      />

      {documents.length > 0 && (
        <div className="space-y-1.5">
          {documents.map((doc) => (
            <div
              key={doc.path}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              {getFileIcon(doc.type)}
              <span className="flex-1 text-sm text-gray-800 truncate">
                {doc.name}
              </span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {formatSize(doc.size)}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(doc)}
                className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {documents.length < MAX_DOCS && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors w-full disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
          {uploading ? "מעלה..." : "צרף מסמך (PDF, Word, Excel...)"}
        </button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
