"use client";

import { useState, useEffect, useCallback } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import type { BankAccount } from "../types";

interface UploadedFile {
  id: string;
  file_name: string;
  file_format: string;
  date_from: string | null;
  date_to: string | null;
  row_count: number | null;
  uploaded_at: string;
  bank_account_id: string | null;
}

const FORMAT_LABELS: Record<string, string> = {
  leumi_csv: "לאומי CSV",
  hapoalim_xlsx: "הפועלים XLSX",
  mizrahi_xls: "מזרחי XLS",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Props {
  accounts: BankAccount[];
}

export function FileHistoryPanel({ accounts }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/uploaded-files");
      const data = await res.json();
      setFiles(data.files ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const accountName = (id: string | null) =>
    accounts.find((a) => a.id === id)?.display_name ?? "—";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-2">
        <FileSpreadsheet className="w-4 h-4 text-gray-400" />
        <h2 className="font-semibold text-gray-700 text-sm">קבצים שהועלו</h2>
        {!loading && <span className="text-xs text-gray-400">({files.length})</span>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-5 py-4 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>טוען...</span>
        </div>
      ) : files.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400 italic">לא הועלו קבצים עדיין</p>
      ) : (
        <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
              <FileSpreadsheet className="w-4 h-4 text-blue-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{f.file_name}</p>
                <p className="text-xs text-gray-400">
                  {FORMAT_LABELS[f.file_format] ?? f.file_format}
                  {f.bank_account_id ? ` · ${accountName(f.bank_account_id)}` : ""}
                  {f.date_from && f.date_to ? ` · ${fmt(f.date_from)} – ${fmt(f.date_to)}` : ""}
                </p>
              </div>
              <div className="text-left shrink-0">
                {f.row_count != null && (
                  <p className="text-sm font-bold text-gray-700">{f.row_count.toLocaleString()}</p>
                )}
                <p className="text-xs text-gray-400">{fmt(f.uploaded_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
