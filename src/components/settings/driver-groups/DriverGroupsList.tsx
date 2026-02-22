"use client";

import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Store,
  Check,
  AlertCircle,
  User,
  Truck,
} from "lucide-react";
import { clsx } from "clsx";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import type {
  DriverGroupWithInfo,
  IndividualDriverWithInfo,
} from "@/hooks/useDriverGroups";

// ============================================
// TYPES
// ============================================

interface DriverGroupsListProps {
  groups: DriverGroupWithInfo[];
  individuals: IndividualDriverWithInfo[];
  unassigned: string[];
  stats: {
    totalGroups: number;
    totalIndividuals: number;
    totalDriversInGroups: number;
    unassignedCount: number;
    groupsWithCosts: number;
    individualsWithCosts: number;
  };
  onCreateGroup: () => void;
  onEditGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onCreateIndividual: () => void;
  onEditIndividual: (driverId: string) => void;
  onDeleteIndividual: (driverId: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export function DriverGroupsList({
  groups,
  individuals,
  unassigned,
  stats,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  onCreateIndividual,
  onEditIndividual,
  onDeleteIndividual,
}: DriverGroupsListProps) {
  const handleDeleteGroup = (groupId: string, name: string) => {
    if (confirm(`האם למחוק את קבוצת "${name}"?`)) {
      onDeleteGroup(groupId);
    }
  };

  const handleDeleteIndividual = (driverId: string, name: string) => {
    if (confirm(`האם למחוק את הגדרות "${name}"?`)) {
      onDeleteIndividual(driverId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600">קבוצות</p>
                <p className="text-2xl font-bold text-blue-700">
                  {stats.totalGroups}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-purple-600">נהגים בודדים</p>
                <p className="text-2xl font-bold text-purple-700">
                  {stats.totalIndividuals}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600">עם עלויות</p>
                <p className="text-2xl font-bold text-green-700">
                  {stats.groupsWithCosts + stats.individualsWithCosts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-600">ללא הגדרה</p>
                <p className="text-2xl font-bold text-amber-700">
                  {stats.unassignedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle icon={<Users className="w-5 h-5" />}>
              קבוצות נהגים
            </CardTitle>
            <button
              onClick={onCreateGroup}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>קבוצה חדשה</span>
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p>אין קבוצות נהגים</p>
              <p className="text-sm">צור קבוצה לנהגים באותו אזור</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        group.hasCosts ? "bg-green-100" : "bg-gray-100",
                      )}
                    >
                      <Truck
                        className={clsx(
                          "w-5 h-5",
                          group.hasCosts ? "text-green-600" : "text-gray-500",
                        )}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{group.driverNames.length} נהגים</span>
                        <span className="text-gray-300">|</span>
                        <span className="flex items-center gap-1">
                          <Store className="w-3.5 h-3.5" />
                          {group.storeCount} חנויות
                        </span>
                        {group.hasCosts && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="flex items-center gap-1 text-green-600">
                              <Check className="w-3.5 h-3.5" />
                              עלויות מוגדרות
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditGroup(group.id)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="עריכה"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="מחיקה"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Drivers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle icon={<User className="w-5 h-5" />}>
              נהגים בודדים
            </CardTitle>
            <button
              onClick={onCreateIndividual}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>הגדר נהג</span>
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {individuals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p>אין נהגים בודדים עם עלות מוגדרת</p>
              <p className="text-sm">הגדר עלות לנהג שלא שייך לקבוצה</p>
            </div>
          ) : (
            <div className="space-y-2">
              {individuals.map((driver) => (
                <div
                  key={driver.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        driver.hasCosts ? "bg-green-100" : "bg-gray-100",
                      )}
                    >
                      <User
                        className={clsx(
                          "w-5 h-5",
                          driver.hasCosts ? "text-green-600" : "text-gray-500",
                        )}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {driver.driverName}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Store className="w-3.5 h-3.5" />
                          {driver.storeCount} חנויות
                        </span>
                        {driver.hasCosts && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="flex items-center gap-1 text-green-600">
                              <Check className="w-3.5 h-3.5" />
                              עלויות מוגדרות
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditIndividual(driver.id)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="עריכה"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteIndividual(driver.id, driver.driverName)
                      }
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="מחיקה"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Drivers */}
      {unassigned.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle
              icon={<AlertCircle className="w-5 h-5 text-amber-500" />}
            >
              נהגים ללא הגדרת עלות ({unassigned.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              💡 נהגים אלו יחושבו עם עלות הובלה = 0 (סוכנים, איסוף עצמי
              וכו&apos;)
            </p>
            <div className="flex flex-wrap gap-2">
              {unassigned.slice(0, 30).map((driver) => (
                <span
                  key={driver}
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 text-sm rounded-full border border-amber-200"
                >
                  {driver}
                </span>
              ))}
              {unassigned.length > 30 && (
                <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-full">
                  +{unassigned.length - 30} נוספים
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
