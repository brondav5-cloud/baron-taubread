"use client";

import { Truck } from "lucide-react";
import { PageHeader } from "@/components/ui";
import {
  DriverGroupsList,
  DriverGroupEditModal,
} from "@/components/settings/driver-groups";
import { useDriverGroups } from "@/hooks/useDriverGroups";

export default function DriverGroupsPage() {
  const {
    groups,
    individuals,
    unassigned,
    stats,
    editModal,
    openCreateGroupModal,
    openEditGroupModal,
    openCreateIndividualModal,
    openEditIndividualModal,
    closeModal,
    createGroup,
    updateGroup,
    deleteGroup,
    createIndividual,
    updateIndividual,
    deleteIndividual,
  } = useDriverGroups();

  const handleSaveGroup = async (
    name: string,
    drivers: string[],
    costs: import("@/types/costs").DriverProductCost[],
  ) => {
    if (editModal.mode === "create-group") {
      await createGroup(name, drivers, costs);
    } else if (editModal.groupId) {
      await updateGroup(editModal.groupId, name, drivers, costs);
    }
  };

  const handleSaveIndividual = async (
    driverName: string,
    costs: import("@/types/costs").DriverProductCost[],
  ) => {
    if (editModal.mode === "create-individual") {
      await createIndividual(driverName, costs);
    } else if (editModal.driverId) {
      await updateIndividual(editModal.driverId, costs);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="ניהול נהגים ועלויות הובלה"
        subtitle="הגדרת קבוצות נהגים ועלויות משלוח למוצרים"
        icon={<Truck className="w-6 h-6 text-blue-500" />}
      />

      <DriverGroupsList
        groups={groups}
        individuals={individuals}
        unassigned={unassigned}
        stats={stats}
        onCreateGroup={openCreateGroupModal}
        onEditGroup={openEditGroupModal}
        onDeleteGroup={deleteGroup}
        onCreateIndividual={openCreateIndividualModal}
        onEditIndividual={openEditIndividualModal}
        onDeleteIndividual={deleteIndividual}
      />

      <DriverGroupEditModal
        isOpen={editModal.isOpen}
        mode={editModal.mode}
        groupId={editModal.groupId}
        driverId={editModal.driverId}
        initialGroup={
          editModal.groupId
            ? (groups.find((g) => g.id === editModal.groupId) ?? null)
            : null
        }
        initialDriver={
          editModal.driverId
            ? (individuals.find((d) => d.id === editModal.driverId) ?? null)
            : null
        }
        unassigned={unassigned}
        onClose={closeModal}
        onSaveGroup={handleSaveGroup}
        onSaveIndividual={handleSaveIndividual}
      />
    </div>
  );
}
