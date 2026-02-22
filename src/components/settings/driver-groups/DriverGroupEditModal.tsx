"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Users, User } from "lucide-react";
import { clsx } from "clsx";
import { useStoresAndProducts } from "@/context/StoresAndProductsContext";
import type { DriverGroup, IndividualDriver } from "@/types/costs";
import { DriverCostsTable, DriverSelectPanel } from "./modal-parts";
import type { DriverProductCost } from "@/types/costs";

// ============================================
// TYPES
// ============================================

interface DriverEditModalProps {
  isOpen: boolean;
  mode: "create-group" | "edit-group" | "create-individual" | "edit-individual";
  groupId: string | null;
  driverId: string | null;
  initialGroup: DriverGroup | null;
  initialDriver: IndividualDriver | null;
  unassigned: string[];
  onClose: () => void;
  onSaveGroup: (
    name: string,
    drivers: string[],
    costs: DriverProductCost[],
  ) => void | Promise<void>;
  onSaveIndividual: (
    driverName: string,
    costs: DriverProductCost[],
  ) => void | Promise<void>;
}

interface DragFillState {
  isActive: boolean;
  startRow: number;
  value: number;
  selectedRows: number[];
}

// ============================================
// MODAL COMPONENT
// ============================================

export function DriverGroupEditModal({
  isOpen,
  mode,
  groupId: _groupId,
  driverId: _driverId,
  initialGroup,
  initialDriver,
  unassigned,
  onClose,
  onSaveGroup,
  onSaveIndividual,
}: DriverEditModalProps) {
  const { products: dbProducts } = useStoresAndProducts();
  const [name, setName] = useState("");
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [selectedDriverName, setSelectedDriverName] = useState("");
  const [productCosts, setProductCosts] = useState<DriverProductCost[]>([]);
  const [activeTab, setActiveTab] = useState<"drivers" | "costs">("drivers");
  const [searchDriver, setSearchDriver] = useState("");
  const [dragFill, setDragFill] = useState<DragFillState>({
    isActive: false,
    startRow: -1,
    value: 0,
    selectedRows: [],
  });

  const products = dbProducts.map((p) => ({
    id: p.external_id,
    name: p.name,
    category: p.category || "",
  }));
  const isGroupMode = mode === "create-group" || mode === "edit-group";
  const isEditMode = mode === "edit-group" || mode === "edit-individual";

  // Initialize form
  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit-group" && initialGroup) {
      setName(initialGroup.name);
      setSelectedDrivers(initialGroup.driverNames);
      setProductCosts(initialGroup.productCosts);
    } else if (mode === "edit-individual" && initialDriver) {
      setSelectedDriverName(initialDriver.driverName);
      setProductCosts(initialDriver.productCosts);
    } else {
      setName("");
      setSelectedDrivers([]);
      setSelectedDriverName("");
      setProductCosts([]);
    }
    setActiveTab(isGroupMode ? "drivers" : "costs");
    setSearchDriver("");
    setDragFill({ isActive: false, startRow: -1, value: 0, selectedRows: [] });
  }, [isOpen, mode, initialGroup, initialDriver, isGroupMode]);

  // Handle global mouse events for drag fill
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseUp = () => {
      if (dragFill.isActive && dragFill.selectedRows.length > 0) {
        setProductCosts((prev) => {
          const newCosts = [...prev];
          dragFill.selectedRows.forEach((rowIndex) => {
            const product = products[rowIndex];
            if (product) {
              const existingIndex = newCosts.findIndex(
                (pc) => pc.productId === product.id,
              );
              if (existingIndex >= 0) {
                newCosts[existingIndex] = {
                  productId: newCosts[existingIndex]!.productId,
                  deliveryCost: dragFill.value,
                };
              } else {
                newCosts.push({
                  productId: product.id,
                  deliveryCost: dragFill.value,
                });
              }
            }
          });
          return newCosts;
        });
      }
      setDragFill({
        isActive: false,
        startRow: -1,
        value: 0,
        selectedRows: [],
      });
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragFill.isActive)
        setDragFill({
          isActive: false,
          startRow: -1,
          value: 0,
          selectedRows: [],
        });
    };
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, dragFill, products]);

  const availableDrivers = unassigned.filter(
    (d) =>
      !selectedDrivers.includes(d) &&
      d.toLowerCase().includes(searchDriver.toLowerCase()),
  );

  const handleAddDriver = useCallback(
    (driver: string) => setSelectedDrivers((prev) => [...prev, driver]),
    [],
  );
  const handleRemoveDriver = useCallback(
    (driver: string) =>
      setSelectedDrivers((prev) => prev.filter((d) => d !== driver)),
    [],
  );
  const handleCostChange = useCallback((productId: number, cost: number) => {
    setProductCosts((prev) => {
      const existing = prev.find((pc) => pc.productId === productId);
      if (existing)
        return prev.map((pc) =>
          pc.productId === productId ? { ...pc, deliveryCost: cost } : pc,
        );
      return [...prev, { productId, deliveryCost: cost }];
    });
  }, []);
  const startDragFill = useCallback((rowIndex: number, value: number) => {
    if (value > 0)
      setDragFill({
        isActive: true,
        startRow: rowIndex,
        value,
        selectedRows: [rowIndex],
      });
  }, []);
  const updateDragFill = useCallback(
    (rowIndex: number) => {
      if (!dragFill.isActive) return;
      const start = Math.min(dragFill.startRow, rowIndex);
      const end = Math.max(dragFill.startRow, rowIndex);
      setDragFill((prev) => ({
        ...prev,
        selectedRows: Array.from(
          { length: end - start + 1 },
          (_, i) => start + i,
        ),
      }));
    },
    [dragFill.isActive, dragFill.startRow],
  );

  const handleSave = useCallback(async () => {
    if (isGroupMode) {
      if (!name.trim()) return;
      await onSaveGroup(name, selectedDrivers, productCosts);
    } else {
      if (!selectedDriverName.trim()) return;
      await onSaveIndividual(selectedDriverName, productCosts);
    }
    onClose();
  }, [
    isGroupMode,
    name,
    selectedDrivers,
    selectedDriverName,
    productCosts,
    onSaveGroup,
    onSaveIndividual,
    onClose,
  ]);

  if (!isOpen) return null;

  const modalTitle = {
    "create-group": "קבוצת נהגים חדשה",
    "edit-group": `עריכת ${name || "קבוצה"}`,
    "create-individual": "הגדרת נהג בודד",
    "edit-individual": `עריכת ${selectedDriverName || "נהג"}`,
  }[mode];
  const Icon = isGroupMode ? Users : User;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                "p-2 rounded-lg",
                isGroupMode ? "bg-blue-100" : "bg-purple-100",
              )}
            >
              <Icon
                className={clsx(
                  "w-5 h-5",
                  isGroupMode ? "text-blue-600" : "text-purple-600",
                )}
              />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {modalTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs - only for groups */}
        {isGroupMode && (
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("drivers")}
              className={clsx(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === "drivers"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              נהגים ({selectedDrivers.length})
            </button>
            <button
              onClick={() => setActiveTab("costs")}
              className={clsx(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === "costs"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              עלויות משלוח
            </button>
          </div>
        )}

        {/* Content */}
        <div
          className="p-6 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 200px)" }}
        >
          {/* Name Input */}
          {isGroupMode ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם הקבוצה
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: אזור צפון"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                בחר נהג
              </label>
              {isEditMode ? (
                <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">
                  {selectedDriverName}
                </div>
              ) : (
                <select
                  value={selectedDriverName}
                  onChange={(e) => setSelectedDriverName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">בחר נהג...</option>
                  {unassigned.map((driver) => (
                    <option key={driver} value={driver}>
                      {driver}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Drivers Tab */}
          {isGroupMode && activeTab === "drivers" && (
            <DriverSelectPanel
              selectedDrivers={selectedDrivers}
              availableDrivers={availableDrivers}
              searchDriver={searchDriver}
              onSearchChange={setSearchDriver}
              onAddDriver={handleAddDriver}
              onRemoveDriver={handleRemoveDriver}
            />
          )}

          {/* Costs Tab */}
          {(activeTab === "costs" || !isGroupMode) && (
            <DriverCostsTable
              products={products}
              productCosts={productCosts}
              dragFill={dragFill}
              onCostChange={handleCostChange}
              onStartDragFill={startDragFill}
              onUpdateDragFill={updateDragFill}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={isGroupMode ? !name.trim() : !selectedDriverName.trim()}
            className={clsx(
              "px-6 py-2 rounded-lg font-medium transition-colors",
              (isGroupMode ? name.trim() : selectedDriverName.trim())
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed",
            )}
          >
            {isEditMode ? "שמור שינויים" : "צור"}
          </button>
        </div>
      </div>
    </div>
  );
}
