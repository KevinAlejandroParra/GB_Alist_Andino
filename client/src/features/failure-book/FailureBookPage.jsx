'use client';

import { useAuth } from '../../components/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import FailureDetailModal from '../../components/checklist/FailureDetailModal';
import StandaloneFailureModal from '../../components/checklist/StandaloneFailureModal';
import Swal from 'sweetalert2';
import { useFailureBook } from './hooks/useFailureBook';
import { useFailureSuggestions } from './hooks/useFailureSuggestions';
import FailureBookHeader from './components/FailureBookHeader';
import FailureSearchBar from './components/FailureSearchBar';
import FailureStatsPanel from './components/FailureStatsPanel';
import FailureFiltersPanel from './components/FailureFiltersPanel';
import FailureTabs from './components/FailureTabs';
import FailureGroupedList from './components/FailureGroupedList';
import FailurePagination from './components/FailurePagination';
import FailureEmptyState, { FailureLoadingState } from './components/FailureEmptyState';

export default function FailureBookPage() {
  const { user } = useAuth();
  const book = useFailureBook();
  const suggestions = useFailureSuggestions(book.searchQuery, book.failures);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 text-gray-800 font-sans pb-12">
        <FailureBookHeader
          loading={book.loading}
          currentPage={book.currentPage}
          pagination={book.pagination}
          totalInDb={book.totalInDb}
          showCharts={book.showCharts}
          onToggleCharts={() => book.setShowCharts((v) => !v)}
          onRefresh={book.refresh}
          onCreate={() => book.setShowCreateModal(true)}
          activeTab={book.activeTab}
          filters={book.filters}
          searchQuery={book.debouncedSearch}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
          {book.filteredChecklistName && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-purple-900">
                <i className="fas fa-filter mr-2 text-purple-600" />
                Mostrando fallas del checklist:{' '}
                <span className="font-semibold">{book.filteredChecklistName}</span>
              </p>
              <button
                type="button"
                onClick={book.clearFilters}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline"
              >
                Quitar filtro de checklist
              </button>
            </div>
          )}

          <FailureSearchBar
            searchContainerRef={suggestions.searchContainerRef}
            searchQuery={book.searchQuery}
            onSearchChange={(v) => {
              book.setSearchQuery(v);
              suggestions.setShowSuggestions(true);
            }}
            onClear={() => {
              book.setSearchQuery('');
              suggestions.setShowSuggestions(false);
            }}
            showSuggestions={suggestions.showSuggestions}
            onFocus={() => suggestions.setShowSuggestions(true)}
            hasSuggestionResults={suggestions.hasSuggestionResults}
            groupedSuggestions={suggestions.groupedSuggestions}
            onSelectSuggestion={(v) => suggestions.applySearchSuggestion(v, book.setSearchQuery)}
            loadError={book.loadError}
          />

          <FailureStatsPanel
            stats={book.stats}
            bookStats={book.bookStats}
            statsLoading={book.statsLoading}
            showCharts={book.showCharts}
          />

          <FailureFiltersPanel
            viewMode={book.viewMode}
            onViewModeChange={book.setViewMode}
            filters={book.filters}
            onFiltersChange={(patch) => book.setFilters((prev) => ({ ...prev, ...patch }))}
            checklistTypes={book.checklistTypes}
            searchQuery={book.searchQuery}
            activeTab={book.activeTab}
            onClearFilters={book.clearFilters}
          />

          <FailureTabs activeTab={book.activeTab} onTabChange={book.setActiveTab} totals={book.totals} />

          {book.loading && book.failures.length === 0 ? (
            <FailureLoadingState />
          ) : book.failures.length === 0 ? (
            <FailureEmptyState />
          ) : (
            <>
              <FailureGroupedList
                failures={book.failures}
                viewMode={book.viewMode}
                collapsedSections={book.collapsedSections}
                onToggleSection={book.toggleSection}
                onViewDetail={book.handleViewDetail}
                onLinkToWorkOrder={book.handleLinkToWorkOrder}
                userRole={user?.role_id}
              />
              <FailurePagination
                currentPage={book.currentPage}
                totalPages={book.totalPages}
                total={book.pagination.total}
                onPageChange={book.setCurrentPage}
                loading={book.loading}
              />
            </>
          )}
        </div>

        {book.showDetailModal && (
          <FailureDetailModal
            show={book.showDetailModal}
            onClose={() => {
              book.setShowDetailModal(false);
            }}
            failure={book.selectedFailure}
            onSuccess={() => {
              book.refresh();
              book.setShowDetailModal(false);
            }}
          />
        )}

        {book.showCreateModal && (
          <StandaloneFailureModal
            show={book.showCreateModal}
            onClose={() => book.setShowCreateModal(false)}
            inspectableId={null}
            onSuccess={() => {
              book.refresh();
              book.setShowCreateModal(false);
              Swal.fire({
                title: '¡Creada!',
                text: 'La falla ha sido creada exitosamente',
                icon: 'success',
                confirmButtonColor: '#7c3aed'
              });
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
