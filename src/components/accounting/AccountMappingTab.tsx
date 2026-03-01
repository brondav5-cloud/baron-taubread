"use client";

import { useState } from "react";
import { Search, Tag, FileText, DollarSign, Users } from "lucide-react";
import { clsx } from "clsx";
import type {
  DbAccount, DbCustomTag, DbAccountTag, DbCounterAccountName,
} from "@/types/accounting";
import type { VirtualGroup } from "@/hooks/accountingCalc";
import type { AccountTransaction } from "./account-mapping/shared";
import { TagsTab } from "./account-mapping/TagsTab";
import { CounterNamesTab } from "./account-mapping/CounterNamesTab";
import { SuppliersTab } from "./account-mapping/SuppliersTab";
import { RevenueGroupsTab } from "./account-mapping/RevenueGroupsTab";
import { CustomersTab } from "./account-mapping/CustomersTab";

interface Props {
  accounts: DbAccount[];
  customGroups: VirtualGroup[];
  tags: DbCustomTag[];
  accountTags: DbAccountTag[];
  counterNames: DbCounterAccountName[];
  revenueGroups: { group_code: string }[];
  revenueAccountCodes: { account_code: string; display_name: string | null }[];
  transactions?: AccountTransaction[];
  onSaveTag: (tag: Partial<DbCustomTag> & { name: string; color: string }) => Promise<boolean>;
  onDeleteTag: (id: string) => Promise<boolean>;
  onAssignTag: (accountId: string, tagId: string) => Promise<boolean>;
  onRemoveTag: (accountId: string, tagId: string) => Promise<boolean>;
  onSaveCounterName: (code: string, displayName: string) => Promise<boolean>;
  onRefetch: () => Promise<void>;
}

type InnerTab = "suppliers" | "customers" | "tags" | "counter" | "revenue";

export default function AccountMappingTab({
  accounts, customGroups: _customGroups, tags, accountTags, counterNames, revenueGroups, revenueAccountCodes,
  transactions: txProp,
  onSaveTag, onDeleteTag, onAssignTag, onRemoveTag, onSaveCounterName, onRefetch,
}: Props) {
  const [activeTab, setActiveTab] = useState<InnerTab>("suppliers");

  const innerTabs: Array<{ id: InnerTab; label: string; icon: React.ReactNode }> = [
    { id: "suppliers", label: "ספקים", icon: <Search className="w-3.5 h-3.5" /> },
    { id: "customers", label: "לקוחות", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "tags", label: "תגיות", icon: <Tag className="w-3.5 h-3.5" /> },
    { id: "counter", label: "שמות נגדיים", icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "revenue", label: "קבוצות הכנסה", icon: <DollarSign className="w-3.5 h-3.5" /> },
  ];

  const transactions = txProp ?? [];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {innerTabs.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all border border-b-0",
              activeTab === tab.id
                ? "bg-white border-gray-200 text-primary-700 -mb-px z-10"
                : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50",
            )}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-1">
        {activeTab === "suppliers" && <SuppliersTab accounts={accounts} />}
        {activeTab === "customers" && (
          <CustomersTab
            revenueAccountCodes={revenueAccountCodes}
            onRefetch={onRefetch}
          />
        )}
        {activeTab === "tags" && (
          <TagsTab
            tags={tags}
            accounts={accounts}
            accountTags={accountTags}
            onSaveTag={onSaveTag}
            onDeleteTag={onDeleteTag}
            onAssignTag={onAssignTag}
            onRemoveTag={onRemoveTag}
          />
        )}
        {activeTab === "counter" && (
          <CounterNamesTab
            counterNames={counterNames}
            accounts={accounts}
            transactions={transactions}
            onSaveCounterName={onSaveCounterName}
          />
        )}
        {activeTab === "revenue" && (
          <RevenueGroupsTab
            groupCodes={revenueGroups.map((r) => r.group_code)}
            onRefetch={onRefetch}
          />
        )}
      </div>
    </div>
  );
}
