"use client";

import { useState, useMemo } from "react";
import { Search, Users, LayoutGrid, Tag, FileText } from "lucide-react";
import { clsx } from "clsx";
import type {
  DbAccount, DbCustomGroup, DbAccountClassificationOverride,
  DbCustomTag, DbAccountTag, DbCounterAccountName, ParentSection,
} from "@/types/accounting";
import { getEffectiveGroup } from "./account-mapping/shared";
import type { AccountTransaction } from "./account-mapping/shared";
import { GroupsTab } from "./account-mapping/GroupsTab";
import { ClassificationTab } from "./account-mapping/ClassificationTab";
import { TagsTab } from "./account-mapping/TagsTab";
import { CounterNamesTab } from "./account-mapping/CounterNamesTab";
import { SuppliersTab } from "./account-mapping/SuppliersTab";

interface Props {
  accounts: DbAccount[];
  customGroups: DbCustomGroup[];
  classificationOverrides: DbAccountClassificationOverride[];
  tags: DbCustomTag[];
  accountTags: DbAccountTag[];
  counterNames: DbCounterAccountName[];
  transactions?: AccountTransaction[];
  onSaveClassification: (accountId: string, groupId: string, note?: string) => Promise<boolean>;
  onDeleteClassification: (accountId: string) => Promise<boolean>;
  onBatchSaveClassifications: (changes: Array<{ accountId: string; groupId: string | null }>) => Promise<boolean>;
  onSaveGroup: (group: Partial<DbCustomGroup> & { name: string; parent_section: ParentSection; group_codes: string[] }) => Promise<boolean>;
  onDeleteGroup: (id: string) => Promise<boolean>;
  onSaveTag: (tag: Partial<DbCustomTag> & { name: string; color: string }) => Promise<boolean>;
  onDeleteTag: (id: string) => Promise<boolean>;
  onAssignTag: (accountId: string, tagId: string) => Promise<boolean>;
  onRemoveTag: (accountId: string, tagId: string) => Promise<boolean>;
  onSaveCounterName: (code: string, displayName: string) => Promise<boolean>;
}

type InnerTab = "groups" | "classification" | "suppliers" | "tags" | "counter";

export default function AccountMappingTab({
  accounts, customGroups, classificationOverrides, tags, accountTags, counterNames,
  transactions: txProp,
  onSaveClassification, onDeleteClassification, onBatchSaveClassifications,
  onSaveGroup, onDeleteGroup,
  onSaveTag, onDeleteTag, onAssignTag, onRemoveTag, onSaveCounterName,
}: Props) {
  const [activeTab, setActiveTab] = useState<InnerTab>("suppliers");

  const stats = useMemo(() => {
    const expense = accounts.filter(a => a.account_type === "expense");
    const unclassified = expense.filter(a => !getEffectiveGroup(a, customGroups, classificationOverrides)).length;
    return { unclassified };
  }, [accounts, customGroups, classificationOverrides]);

  const innerTabs: Array<{ id: InnerTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: "suppliers", label: "ספקים", icon: <Search className="w-3.5 h-3.5" /> },
    { id: "groups", label: "קיבוצים", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "classification", label: "מפתח סיווג", icon: <LayoutGrid className="w-3.5 h-3.5" />, badge: stats.unclassified > 0 ? stats.unclassified : undefined },
    { id: "tags", label: "תגיות", icon: <Tag className="w-3.5 h-3.5" /> },
    { id: "counter", label: "שמות נגדיים", icon: <FileText className="w-3.5 h-3.5" /> },
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
            {tab.badge !== undefined && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {tab.badge > 9 ? "9+" : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="pt-1">
        {activeTab === "suppliers" && (
          <SuppliersTab
            accounts={accounts}
            customGroups={customGroups}
            classificationOverrides={classificationOverrides}
            transactions={transactions}
            onBatchSave={onBatchSaveClassifications}
          />
        )}
        {activeTab === "groups" && (
          <GroupsTab
            accounts={accounts}
            customGroups={customGroups}
            classificationOverrides={classificationOverrides}
            onSaveGroup={onSaveGroup}
            onDeleteGroup={onDeleteGroup}
            onSaveClassification={onSaveClassification}
          />
        )}
        {activeTab === "classification" && (
          <ClassificationTab
            accounts={accounts}
            customGroups={customGroups}
            classificationOverrides={classificationOverrides}
            tags={tags}
            accountTags={accountTags}
            onBatchSave={onBatchSaveClassifications}
            onSaveClassification={onSaveClassification}
            onDeleteClassification={onDeleteClassification}
            onAssignTag={onAssignTag}
            onRemoveTag={onRemoveTag}
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
      </div>
    </div>
  );
}
