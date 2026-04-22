"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { BLOCK_KIND_LABELS, BLOCK_KIND_ORDER } from "./constants";
import type { PnlBlockKind, PnlLayoutBlock, PnlLayoutCategoryOption } from "./types";

interface Props {
  open: boolean;
  blocks: PnlLayoutBlock[];
  categoryOptions: PnlLayoutCategoryOption[];
  saving: boolean;
  onClose: () => void;
  onSave: (next: PnlLayoutBlock[]) => Promise<boolean>;
}

function SortableContainer({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="rounded-xl border border-gray-200 bg-white"
    >
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2 text-gray-400" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4" />
        <span className="text-xs">גרור לשינוי סדר בלוק</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function SortableCategoryRow({
  id,
  name,
  onRemove,
}: {
  id: string;
  name: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5"
    >
      <button type="button" className="text-gray-400 hover:text-gray-600" {...attributes} {...listeners}>
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className="flex-1 text-xs text-gray-700 truncate">{name}</span>
      <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-600">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function isKindCompatible(kind: PnlBlockKind, type: PnlLayoutCategoryOption["type"]) {
  if (kind === "income") return type === "income";
  return type === "expense";
}

export default function LayoutEditorModal({
  open,
  blocks,
  categoryOptions,
  saving,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<PnlLayoutBlock[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (open) setDraft(blocks.map((b) => ({ ...b, categories: [...b.categories] })));
  }, [open, blocks]);

  const categoryById = useMemo(() => new Map(categoryOptions.map((c) => [c.id, c])), [categoryOptions]);

  const assignedCategoryIds = useMemo(() => {
    const set = new Set<string>();
    for (const block of draft) {
      for (const row of block.categories) set.add(row.category_id);
    }
    return set;
  }, [draft]);

  function updateBlock(id: string, patch: Partial<PnlLayoutBlock>) {
    setDraft((prev) => prev.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  }

  function removeBlock(id: string) {
    setDraft((prev) => prev.filter((b) => b.id !== id).map((b, i) => ({ ...b, sort_order: i })));
  }

  function addBlock() {
    const block: PnlLayoutBlock = {
      id: crypto.randomUUID(),
      name: "בלוק חדש",
      kind: "operating",
      sort_order: draft.length,
      categories: [],
    };
    setDraft((prev) => [...prev, block]);
  }

  function addCategory(blockId: string, categoryId: string) {
    if (!categoryId) return;
    setDraft((prev) => prev.map((block) => {
      if (block.id !== blockId) return block;
      if (block.categories.some((c) => c.category_id === categoryId)) return block;
      return {
        ...block,
        categories: [...block.categories, { category_id: categoryId, sort_order: block.categories.length }],
      };
    }));
  }

  function removeCategory(blockId: string, categoryId: string) {
    setDraft((prev) => prev.map((block) => {
      if (block.id !== blockId) return block;
      const next = block.categories
        .filter((cat) => cat.category_id !== categoryId)
        .map((cat, index) => ({ ...cat, sort_order: index }));
      return { ...block, categories: next };
    }));
  }

  function parseBlockId(raw: unknown): string | null {
    const value = String(raw);
    return value.startsWith("block:") ? value.slice("block:".length) : null;
  }

  function parseCatId(raw: unknown): { blockId: string; categoryId: string } | null {
    const value = String(raw);
    if (!value.startsWith("cat:")) return null;
    const [, blockId, categoryId] = value.split(":");
    if (!blockId || !categoryId) return null;
    return { blockId, categoryId };
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeBlock = parseBlockId(active.id);
    const overBlock = parseBlockId(over.id);
    if (activeBlock && overBlock && activeBlock !== overBlock) {
      setDraft((prev) => {
        const ids = prev.map((b) => b.id);
        const from = ids.indexOf(activeBlock);
        const to = ids.indexOf(overBlock);
        if (from < 0 || to < 0) return prev;
        return arrayMove(prev, from, to).map((block, i) => ({ ...block, sort_order: i }));
      });
      return;
    }

    const activeCat = parseCatId(active.id);
    const overCat = parseCatId(over.id);
    if (!activeCat || !overCat) return;
    if (activeCat.blockId !== overCat.blockId || activeCat.categoryId === overCat.categoryId) return;

    setDraft((prev) => prev.map((block) => {
      if (block.id !== activeCat.blockId) return block;
      const ids = block.categories.map((c) => c.category_id);
      const from = ids.indexOf(activeCat.categoryId);
      const to = ids.indexOf(overCat.categoryId);
      if (from < 0 || to < 0) return block;
      const reordered = arrayMove(block.categories, from, to).map((cat, i) => ({ ...cat, sort_order: i }));
      return { ...block, categories: reordered };
    }));
  }

  async function handleSave() {
    const success = await onSave(draft);
    if (success) onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-center p-3" dir="rtl">
      <div className="w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">עריכת מבנה דוח רווח והפסד</h2>
            <p className="text-xs text-gray-500 mt-1">גרור בלוקים וקטגוריות כדי לשלוט בסדר התצוגה וסיכומי הביניים.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={draft.map((b) => `block:${b.id}`)} strategy={verticalListSortingStrategy}>
              {draft.map((block) => {
                const options = categoryOptions.filter((opt) => {
                  if (!isKindCompatible(block.kind, opt.type)) return false;
                  if (!assignedCategoryIds.has(opt.id)) return true;
                  return block.categories.some((c) => c.category_id === opt.id);
                });

                return (
                  <SortableContainer key={block.id} id={`block:${block.id}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                      <input
                        value={block.name}
                        onChange={(e) => updateBlock(block.id, { name: e.target.value })}
                        className="md:col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-300"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={block.kind}
                          onChange={(e) => updateBlock(block.id, { kind: e.target.value as PnlBlockKind })}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                        >
                          {BLOCK_KIND_ORDER.map((kind) => (
                            <option key={kind} value={kind}>{BLOCK_KIND_LABELS[kind]}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => removeBlock(block.id)} className="text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <select
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white min-w-[220px]"
                        defaultValue=""
                        onChange={(e) => {
                          addCategory(block.id, e.target.value);
                          e.currentTarget.value = "";
                        }}
                      >
                        <option value="">הוסף קטגוריה לבלוק...</option>
                        {options.map((opt) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                      </select>
                    </div>

                    <SortableContext
                      items={block.categories.map((c) => `cat:${block.id}:${c.category_id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1.5">
                        {block.categories.length === 0 && (
                          <div className="text-xs text-gray-400 border border-dashed rounded-lg px-2 py-2">אין קטגוריות בבלוק</div>
                        )}
                        {block.categories.map((cat) => (
                          <SortableCategoryRow
                            key={cat.category_id}
                            id={`cat:${block.id}:${cat.category_id}`}
                            name={categoryById.get(cat.category_id)?.name ?? cat.category_id}
                            onRemove={() => removeCategory(block.id, cat.category_id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </SortableContainer>
                );
              })}
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={addBlock}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <Plus className="w-3.5 h-3.5" />
            הוסף בלוק
          </button>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">טיפ: בלוק מסוג &quot;הכנסות&quot; מקבל רק קטגוריות הכנסה, וכל השאר מוגבלים להוצאות.</p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "שומר..." : "שמור מבנה"}
          </button>
        </div>
      </div>
    </div>
  );
}
