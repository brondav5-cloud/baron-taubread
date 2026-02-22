"use client";

import { GitCompare } from "lucide-react";
import { Card, CardContent, PageHeader } from "@/components/ui";
import { LoadingState } from "@/components/common";
import { useComparisonSupabase } from "@/hooks/useComparisonSupabase";
import {
  CriteriaStoreSelector,
  SelectedStoresTags,
  CityStatsCards,
  SelectedStoresSection,
  CompareCharts,
  CompareTable,
  StoresByCriteriaList,
  StoreSelectorModal,
  ComparisonSummary,
  CompareFiltersPanel,
} from "@/components/compare";

export default function ComparePage() {
  const {
    isLoading,
    error,
    cities: _cities,

    // State
    selectedCity,
    setSelectedCity,
    selectedCriteriaType,
    setSelectedCriteriaType,
    selectedCriteriaValue,
    setSelectedCriteriaValue,
    criteriaValueOptions,
    criteriaStores,
    criteriaStats,
    criteriaListTitle,
    selectedStores,
    showStoreSelector,
    setShowStoreSelector,
    viewMode,
    setViewMode,
    monthSelection,
    setMonthSelection,
    storeSearch,
    setStoreSearch,

    // Computed
    searchResults,
    filteredStores,
    filters,
    filterOptions,
    showFilters,
    setShowFilters,
    updateFilter,
    clearFilters,
    activeFiltersCount,
    cityStores,
    cityStats: _cityStats,
    comparisonData,
    radarData,

    // Actions
    addStore,
    removeStore,
    clearAllStores,
    addAllCityStores: _addAllCityStores,
    addAllCriteriaStores,
    addAllFilteredStores,

    // Helpers
    getPeriodLabel,
    metricsPeriodLabels,
    periodLabel,
  } = useComparisonSupabase();

  if (isLoading) {
    return (
      <div className="flex justify-center min-h-[400px] items-center">
        <LoadingState message="טוען נתונים להשוואה..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          שגיאה בטעינת נתונים
        </h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="השוואת חנויות"
        subtitle={
          periodLabel
            ? `השווה ביצועים בין חנויות • ${periodLabel}`
            : "השווה ביצועים בין חנויות"
        }
        icon={<GitCompare className="w-6 h-6 text-purple-500" />}
      />

      {/* חיפוש ובחירה לפי עיר, סוכן, רשת, נהג או קבוצת נהגים */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-4">
            <CriteriaStoreSelector
              storeSearch={storeSearch}
              onSearchChange={setStoreSearch}
              searchResults={searchResults}
              onSelectStore={addStore}
              selectedCriteriaType={selectedCriteriaType}
              onCriteriaTypeChange={(type) => {
                setSelectedCriteriaType(type);
                setSelectedCriteriaValue("");
                if (type === "city") setSelectedCity("");
              }}
              selectedCriteriaValue={selectedCriteriaValue}
              onCriteriaValueChange={(value) => {
                setSelectedCriteriaValue(value);
                if (selectedCriteriaType === "city") setSelectedCity(value);
              }}
              criteriaValueOptions={criteriaValueOptions}
            />
            <SelectedStoresTags
              stores={selectedStores}
              onRemoveStore={(id) => removeStore(String(id))}
              onClearAll={clearAllStores}
            />
          </div>
        </CardContent>
      </Card>

      {/* בחירת חנויות לפי - עיר, רשת, סוכן, נהג, קבוצת נהגים (סינון מתקדם) */}
      <CompareFiltersPanel
        show={showFilters}
        filters={filters}
        filterOptions={filterOptions}
        activeFiltersCount={activeFiltersCount}
        filteredStoresCount={filteredStores.length}
        onUpdateFilter={updateFilter}
        onClearFilters={clearFilters}
        onToggle={() => setShowFilters((prev) => !prev)}
        onAddAllFiltered={addAllFilteredStores}
      />

      {/* רשימת חנויות לפי בחירה - מוצגת כשנבחרה קטגוריה וערך (עיר, סוכן, רשת, נהג, קבוצה) */}
      {selectedCriteriaValue && criteriaStores.length > 0 && (
        <>
          {criteriaStats && (
            <CityStatsCards
              stats={criteriaStats}
              periodLabels={metricsPeriodLabels}
            />
          )}
          <StoresByCriteriaList
            title={criteriaListTitle}
            description={`בחר מתוך ${criteriaStores.length} חנויות - הכל או חלק`}
            stores={criteriaStores}
            selectedStores={selectedStores}
            onAddStore={addStore}
            onRemoveStore={(id) => removeStore(String(id))}
            onAddAll={addAllCriteriaStores}
            onClearAll={clearAllStores}
          />
        </>
      )}

      {!selectedCriteriaValue &&
        activeFiltersCount > 0 &&
        filteredStores.length > 0 && (
          <StoresByCriteriaList
            title={`חנויות לפי הבחירה (${filteredStores.length})`}
            description="בחר חנויות מהרשימה להוספה להשוואה"
            stores={filteredStores}
            selectedStores={selectedStores}
            onAddStore={addStore}
            onRemoveStore={(id) => removeStore(String(id))}
            onAddAll={addAllFilteredStores}
            onClearAll={clearAllStores}
          />
        )}

      {/* Selected Stores for Comparison */}
      <SelectedStoresSection
        stores={selectedStores}
        onRemoveStore={(id) => removeStore(String(id))}
        onAddStoreClick={() => setShowStoreSelector(true)}
      />

      {/* Summary for many stores (16+) */}
      {selectedStores.length >= 16 && (
        <ComparisonSummary
          stores={selectedStores}
          periodLabels={metricsPeriodLabels}
        />
      )}

      {/* Comparison Charts */}
      <CompareCharts
        stores={selectedStores}
        comparisonData={comparisonData}
        radarData={radarData}
      />

      {/* Comparison Table */}
      <CompareTable
        stores={selectedStores}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        monthSelection={monthSelection}
        onMonthSelectionChange={setMonthSelection}
        getPeriodLabel={getPeriodLabel}
        metricsPeriodLabels={metricsPeriodLabels}
      />

      {/* Store Selector Modal */}
      <StoreSelectorModal
        isOpen={showStoreSelector}
        onClose={() => setShowStoreSelector(false)}
        stores={
          selectedCriteriaValue
            ? criteriaStores
            : selectedCity
              ? cityStores
              : filteredStores
        }
        selectedStores={selectedStores}
        onSelectStore={addStore}
      />
    </div>
  );
}
