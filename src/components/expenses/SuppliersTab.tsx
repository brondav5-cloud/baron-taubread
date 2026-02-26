"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Trash2,
  Tag,
  Link,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import type { DbSupplier, DbExpenseCategory, ExpenseCategoryParentType } from "@/types/expenses";
import { PARENT_TYPE_LABELS } from "@/types/expenses";

interface Props {
  suppliers: DbSupplier[];
  categories: DbExpenseCategory[];
  onUpdateSupplier: (
    id: string,
    update: { categoryId?: string | null; mergedIntoId?: string | null; name?: string },
  ) => Promise<boolean>;
  onAddCategory: (name: string, parentType: string) => Promise<DbExpenseCategory | null>;
  onDeleteCategory: (id: string) => Promise<boolean>;
}

export default function SuppliersTab({
  suppliers,
  categories,
  onUpdateSupplier,
  onAddCategory,
  onDeleteCategory,
}: Props) {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<ExpenseCategoryParentType>("operating");
  const [savingId, setSavingId] = useState<string | null>(null);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.account_key.includes(search);
      const matchesCategory =
        filterCategory === "all" ||
        (filterCategory === "unassigned" && !s.category_id) ||
        s.category_id === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [suppliers, search, filterCategory]);

  const unassignedCount = suppliers.filter((s) => !s.category_id).length;

  const handleCategoryChange = async (supplierId: string, categoryId: string) => {
    setSavingId(supplierId);
    await onUpdateSupplier(supplierId, {
      categoryId: categoryId || null,
    });
    setSavingId(null);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    await onAddCategory(newCatName.trim(), newCatType);
    setNewCatName("");
    setShowAddCategory(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">ספקים וקטגוריות</h2>
          <p className="text-sm text-gray-500">
            {suppliers.length} ספקים{" "}
            {unassignedCount > 0 && (
              <span className="text-amber-600 font-medium">
                ({unassignedCount} ללא קטגוריה)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAddCategory(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          קטגוריה חדשה
        </button>
      </div>

      {/* Add category dialog */}
      {showAddCategory && (
        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary-900">
              הוספת קטגוריה חדשה
            </h3>
            <button onClick={() => setShowAddCategory(false)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">שם הקטגוריה</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="למשל: חומרי גלם"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">סוג</label>
              <select
                value={newCatType}
                onChange={(e) =>
                  setNewCatType(e.target.value as ExpenseCategoryParentType)
                }
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                {Object.entries(PARENT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddCategory}
              disabled={!newCatName.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              הוסף
            </button>
          </div>
        </div>
      )}

      {/* Categories overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {categories.map((cat) => {
          const count = suppliers.filter((s) => s.category_id === cat.id).length;
          return (
            <div
              key={cat.id}
              className="bg-white border border-gray-100 rounded-xl p-3 group relative"
            >
              <div className="flex items-center justify-between">
                <Tag className="w-3.5 h-3.5 text-primary-400" />
                <button
                  onClick={() => onDeleteCategory(cat.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title="מחק קטגוריה"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                </button>
              </div>
              <p className="text-sm font-medium text-gray-900 mt-2">{cat.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {PARENT_TYPE_LABELS[cat.parent_type]} · {count} ספקים
              </p>
            </div>
          );
        })}
      </div>

      {/* Search & filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חפש ספק לפי שם או קוד..."
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
        >
          <option value="all">כל הקטגוריות</option>
          <option value="unassigned">ללא קטגוריה</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Suppliers table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                שם ספק
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                מפתח חשבון
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                קטגוריה
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                פעולות
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((supplier) => (
              <tr
                key={supplier.id}
                className={clsx(
                  "border-b border-gray-50 hover:bg-gray-50 transition-colors",
                  !supplier.category_id && "bg-amber-50/50",
                )}
              >
                <td className="py-3 px-4 font-medium text-gray-900">
                  {supplier.name}
                </td>
                <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                  {supplier.account_key}
                </td>
                <td className="py-3 px-4">
                  <select
                    value={supplier.category_id || ""}
                    onChange={(e) => handleCategoryChange(supplier.id, e.target.value)}
                    disabled={savingId === supplier.id}
                    className={clsx(
                      "px-2 py-1.5 border rounded-lg text-xs bg-white transition-colors",
                      supplier.category_id
                        ? "border-gray-200 text-gray-700"
                        : "border-amber-300 text-amber-700 bg-amber-50",
                      savingId === supplier.id && "opacity-50",
                    )}
                  >
                    <option value="">בחר קטגוריה...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-4">
                  <button
                    className="text-gray-400 hover:text-primary-600 transition-colors"
                    title="מזג ספק"
                  >
                    <Link className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSuppliers.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>לא נמצאו ספקים</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
