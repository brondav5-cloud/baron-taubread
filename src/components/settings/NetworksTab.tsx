"use client";

import { useState } from "react";
import { Building2, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useNetworks } from "@/hooks/useNetworks";
import { NetworkEditModal } from "./NetworkEditModal";
import type { NetworkWithInfo } from "@/types/network";

export function NetworksTab() {
  const { networks, isLoading, addNetwork, editNetwork, removeNetwork } =
    useNetworks();
  const [search, setSearch] = useState("");
  const [editingNetwork, setEditingNetwork] = useState<NetworkWithInfo | null>(
    null,
  );
  const [isCreateMode, setIsCreateMode] = useState(false);

  const filteredNetworks = networks.filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = () => {
    setEditingNetwork(null);
    setIsCreateMode(true);
  };

  const handleEdit = (network: NetworkWithInfo) => {
    setEditingNetwork(network);
    setIsCreateMode(false);
  };

  const handleDelete = (networkId: string, name: string) => {
    if (confirm(`למחוק את הרשת "${name}"?`)) {
      removeNetwork(networkId);
    }
  };

  const handleSave = (name: string, storeIds: number[]) => {
    if (isCreateMode) {
      addNetwork(name, storeIds);
    } else if (editingNetwork) {
      editNetwork(editingNetwork.id, { name, storeIds });
    }
    setEditingNetwork(null);
    setIsCreateMode(false);
  };

  const handleClose = () => {
    setEditingNetwork(null);
    setIsCreateMode(false);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-500" />
            רשתות ({networks.length})
          </h2>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600"
          >
            <Plus className="w-4 h-4" />
            רשת חדשה
          </button>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש רשת..."
            className="w-full pr-10 pl-4 py-2 bg-gray-50 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Networks List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filteredNetworks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {search ? "לא נמצאו רשתות" : "אין רשתות במערכת"}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNetworks.map((network) => (
              <NetworkRow
                key={network.id}
                network={network}
                onEdit={() => handleEdit(network)}
                onDelete={() => handleDelete(network.id, network.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {(editingNetwork || isCreateMode) && (
        <NetworkEditModal
          network={editingNetwork}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

function NetworkRow({
  network,
  onEdit,
  onDelete,
}: {
  network: NetworkWithInfo;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <div className="font-medium text-gray-900">{network.name}</div>
          <div className="text-sm text-gray-500">
            {network.storeCount} חנויות
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg"
          title="עריכה"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
          title="מחיקה"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-500">טוען רשתות...</p>
    </div>
  );
}
