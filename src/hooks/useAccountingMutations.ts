"use client";

import { useCallback } from "react";
import type {
  DbTransactionOverride,
  DbCustomTag,
  DbAlertRule,
} from "@/types/accounting";

export interface AccountingMutations {
  saveTransactionOverride: (txId: string, type: DbTransactionOverride["override_type"], newValue?: string, note?: string) => Promise<boolean>;
  deleteTransactionOverride: (id: string) => Promise<boolean>;
  saveTag: (tag: Partial<DbCustomTag> & { name: string; color: string }) => Promise<boolean>;
  deleteTag: (id: string) => Promise<boolean>;
  assignTag: (accountId: string, tagId: string) => Promise<boolean>;
  removeTag: (accountId: string, tagId: string) => Promise<boolean>;
  saveCounterName: (code: string, displayName: string) => Promise<boolean>;
  saveAlertRule: (rule: Partial<DbAlertRule>) => Promise<boolean>;
  deleteAlertRule: (id: string) => Promise<boolean>;
}

export function useAccountingMutations(refetch: () => Promise<void>): AccountingMutations {
  const saveTransactionOverride = useCallback(
    async (txId: string, type: DbTransactionOverride["override_type"], newValue?: string, note?: string): Promise<boolean> => {
      const res = await fetch("/api/accounting/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: txId, override_type: type, new_value: newValue, note }),
      });
      if (res.ok) await refetch();
      return res.ok;
    },
    [refetch],
  );

  const deleteTransactionOverride = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/accounting/overrides?id=${id}`, { method: "DELETE" });
      if (res.ok) await refetch();
      return res.ok;
    },
    [refetch],
  );

  const saveTag = useCallback(
    async (tag: Partial<DbCustomTag> & { name: string; color: string }): Promise<boolean> => {
      const method = tag.id ? "PATCH" : "POST";
      const res = await fetch("/api/accounting/tags", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "tag", ...tag }),
      });
      if (res.ok) await refetch();
      return res.ok;
    },
    [refetch],
  );

  const deleteTag = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/accounting/tags?id=${id}`, { method: "DELETE" });
      if (res.ok) await refetch();
      return res.ok;
    },
    [refetch],
  );

  const assignTag = useCallback(
    async (accountId: string, tagId: string): Promise<boolean> => {
      const res = await fetch("/api/accounting/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "assign", account_id: accountId, tag_id: tagId }),
      });
      if (res.ok) await refetch();
      return res.ok;
    },
    [refetch],
  );

  const removeTag = useCallback(
    async (accountId: string, tagId: string): Promise<boolean> => {
      const res = await fetch(`/api/accounting/tags?account_id=${accountId}&tag_id=${tagId}`, { method: "DELETE" });
      if (res.ok) await refetch();
      return res.ok;
    },
    [refetch],
  );

  const saveCounterName = useCallback(
    async (code: string, displayName: string): Promise<boolean> => {
      const res = await fetch("/api/accounting/counter-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counter_account_code: code, display_name: displayName }),
      });
      if (res.ok) await refetch();
      return res.ok;
    },
    [refetch],
  );

  const saveAlertRule = useCallback(
    async (rule: Partial<DbAlertRule>): Promise<boolean> => {
      const method = rule.id ? "PATCH" : "POST";
      const res = await fetch("/api/accounting/alerts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      if (res.ok) await refetch();
      return res.ok;
    },
    [refetch],
  );

  const deleteAlertRule = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/accounting/alerts?id=${id}`, { method: "DELETE" });
      if (res.ok) await refetch();
      return res.ok;
    },
    [refetch],
  );

  return {
    saveTransactionOverride,
    deleteTransactionOverride,
    saveTag,
    deleteTag,
    assignTag,
    removeTag,
    saveCounterName,
    saveAlertRule,
    deleteAlertRule,
  };
}
