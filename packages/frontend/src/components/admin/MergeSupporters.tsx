import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchForMerge, useMergeSupporters } from '../../hooks/useSupporters';
import { SupporterType } from '@supporter360/shared';

const typeColors: Record<SupporterType, string> = {
  'Member': 'bg-blue-100 text-blue-800',
  'Season Ticket Holder': 'bg-purple-100 text-purple-800',
  'Ticket Buyer': 'bg-green-100 text-green-800',
  'Shop Buyer': 'bg-orange-100 text-orange-800',
  'Away Supporter': 'bg-red-100 text-red-800',
  'Staff/VIP': 'bg-yellow-100 text-yellow-800',
  'Unknown': 'bg-gray-100 text-gray-800',
};

interface SupporterForMerge {
  supporter_id: string;
  name: string | null;
  email: string | null;
  supporter_type: SupporterType;
  last_ticket_order_date: string | null;
  last_shop_order_date: string | null;
  membership_status: string | null;
}

interface SupporterCardProps {
  supporter: SupporterForMerge;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  label: string;
  showRadio?: boolean;
  isTarget?: boolean;
  onSetAsTarget?: () => void;
}

function SupporterCard({
  supporter,
  isSelected,
  onSelect,
  onRemove,
  label,
  showRadio = false,
  isTarget = false,
  onSetAsTarget,
}: SupporterCardProps) {
  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-GB');
  };

  return (
    <div className={`bg-white rounded-lg border-2 p-4 transition-all ${
      isTarget ? 'border-green-500 shadow-md' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
          <h4 className="text-lg font-semibold text-gray-900 mt-1">
            {supporter.name || 'Unknown Name'}
          </h4>
          <p className="text-gray-600 text-sm">{supporter.email || 'No email'}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded ${typeColors[supporter.supporter_type]}`}>
          {supporter.supporter_type}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-3">
        <div>
          <span className="font-medium">Last Ticket:</span> {formatDate(supporter.last_ticket_order_date)}
        </div>
        <div>
          <span className="font-medium">Last Shop:</span> {formatDate(supporter.last_shop_order_date)}
        </div>
        <div>
          <span className="font-medium">Member:</span> {supporter.membership_status || 'No'}
        </div>
      </div>

      {/* ID Display */}
      <div className="text-xs font-mono text-gray-400 mb-3">
        ID: {supporter.supporter_id.slice(0, 8)}...
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isSelected ? (
          <button
            onClick={onRemove}
            className="flex-1 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={onSelect}
            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Select
          </button>
        )}
        {showRadio && onSetAsTarget && (
          <button
            onClick={onSetAsTarget}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${
              isTarget
                ? 'bg-green-50 border-green-500 text-green-700'
                : 'bg-white border-gray-300 text-gray-700 hover:border-green-300'
            }`}
          >
            {isTarget ? '✓ Target' : 'Set as Target'}
          </button>
        )}
      </div>
    </div>
  );
}

// Search Results Dropdown
interface SearchResultsProps {
  results: SupporterForMerge[];
  onSelect: (supporter: SupporterForMerge) => void;
  onSelectAsSource: (supporter: SupporterForMerge) => void;
  excludedIds: string[];
}

function SearchResults({ results, onSelect, onSelectAsSource, excludedIds }: SearchResultsProps) {
  const filteredResults = results.filter(r => !excludedIds.includes(r.supporter_id));

  if (filteredResults.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        {results.length === 0 ? 'No supporters found' : 'No more supporters to display'}
      </div>
    );
  }

  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-lg max-h-64 overflow-y-auto custom-scrollbar">
      {filteredResults.map(result => (
        <div
          key={result.supporter_id}
          className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 flex justify-between items-center"
        >
            <div className="flex-1">
              <div className="font-medium text-gray-900">{result.name || 'Unknown Name'}</div>
              <div className="text-sm text-gray-600">{result.email || 'No email'}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAsSource(result);
                }}
                className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
              >
                Source
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(result);
                }}
                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                Target
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}

// Confirmation Modal
interface ConfirmMergeModalProps {
  isOpen: boolean;
  source: SupporterForMerge;
  target: SupporterForMerge;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function ConfirmMergeModal({
  isOpen,
  source,
  target,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
  isPending,
}: ConfirmMergeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-merge-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 id="confirm-merge-title" className="text-xl font-bold text-gray-900 mb-4">Confirm Merge</h3>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6" role="alert">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">This action cannot be undone</p>
                <p>
                  The source supporter record will be permanently deleted. All events, linked IDs, and
                  email aliases will be transferred to the target record.
                </p>
              </div>
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-red-700 mb-2">Source (will be deleted)</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="font-medium text-gray-900">{source.name || 'Unknown'}</p>
                <p className="text-sm text-gray-600">{source.email || 'No email'}</p>
                <p className="text-xs text-gray-500 mt-1 font-mono">{source.supporter_id}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-green-700 mb-2">Target (will be kept)</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="font-medium text-gray-900">{target.name || 'Unknown'}</p>
                <p className="text-sm text-gray-600">{target.email || 'No email'}</p>
                <p className="text-xs text-gray-500 mt-1 font-mono">{target.supporter_id}</p>
              </div>
            </div>
          </div>

          {/* What will happen */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">What will happen:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-start">
                <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                All timeline events will be transferred to target
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Linked IDs will be merged
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Email aliases will be transferred
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Source record will be permanently deleted
              </li>
              <li className="flex items-start">
                <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                An audit log entry will be created
              </li>
            </ul>
          </div>

          {/* Reason input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for merge <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Explain why these records should be merged..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isPending}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!reason.trim() || isPending}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {isPending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Merging...
                </span>
              ) : 'Confirm Merge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Success Modal
interface SuccessModalProps {
  isOpen: boolean;
  targetId: string;
  onClose: () => void;
  onViewAuditLog: () => void;
}

function SuccessModal({ isOpen, targetId, onClose, onViewAuditLog }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 id="success-title" className="text-xl font-bold text-gray-900 mb-2">Merge Complete!</h3>
          <p className="text-gray-600 mb-6">
            The supporters have been successfully merged.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Done
            </button>
            <button
              onClick={onViewAuditLog}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              View Audit Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MergeSupporters() {
  const navigate = useNavigate();

  // Search states
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');

  // Selected supporters
  const [source, setSource] = useState<SupporterForMerge | null>(null);
  const [target, setTarget] = useState<SupporterForMerge | null>(null);

  // Search results
  const sourceResults = useSearchForMerge(sourceSearch);
  const targetResults = useSearchForMerge(targetSearch);

  // Modal states
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mergedTargetId, setMergedTargetId] = useState('');
  const [reason, setReason] = useState('');

  // Merge mutation
  const mergeMutation = useMergeSupporters();

  // Auto-select target as the older record (by created_at if available, otherwise keep manual)
  const autoSelectTarget = useCallback(() => {
    if (source && target) {
      // If we had created_at, we'd compare them here
      // For now, default to keeping the first selected as target
    }
  }, [source, target]);

  // Handle search selection
  const handleSelectAsSource = useCallback((supporter: SupporterForMerge) => {
    setSource(supporter);
    setSourceSearch('');
    if (target?.supporter_id === supporter.supporter_id) {
      setTarget(null);
    }
  }, [target]);

  const handleSelectAsTarget = useCallback((supporter: SupporterForMerge) => {
    setTarget(supporter);
    setTargetSearch('');
    if (source?.supporter_id === supporter.supporter_id) {
      setSource(null);
    }
  }, [source]);

  // Initiate merge
  const handleInitiateMerge = useCallback(() => {
    if (!source || !target) return;
    setShowConfirm(true);
  }, [source, target]);

  // Confirm merge
  const handleConfirmMerge = useCallback(async () => {
    if (!source || !target || !reason.trim()) return;

    try {
      await mergeMutation.mutateAsync({
        sourceId: source.supporter_id,
        targetId: target.supporter_id,
        reason: reason.trim(),
      });

      setMergedTargetId(target.supporter_id);
      setShowConfirm(false);
      setShowSuccess(true);

      // Reset form
      setSource(null);
      setTarget(null);
      setReason('');
      setSourceSearch('');
      setTargetSearch('');
    } catch (error) {
      // Error is handled by the mutation
    }
  }, [source, target, reason, mergeMutation]);

  // Close modals
  const handleCloseConfirm = useCallback(() => {
    if (!mergeMutation.isPending) {
      setShowConfirm(false);
    }
  }, [mergeMutation.isPending]);

  const handleCloseSuccess = useCallback(() => {
    setShowSuccess(false);
  }, []);

  const handleViewAuditLog = useCallback(() => {
    setShowSuccess(false);
    // Would navigate to audit log page when implemented
    // TODO: Implement audit log page
  }, []);

  // Clear selection
  const handleClearSource = useCallback(() => {
    setSource(null);
  }, []);

  const handleClearTarget = useCallback(() => {
    setTarget(null);
  }, []);

  const canMerge = source && target && source.supporter_id !== target.supporter_id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Merge Supporters</h2>
        <p className="text-gray-600 mt-1">
          Combine duplicate supporter records. Search and select two supporters to merge.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How merging works:</p>
            <ul className="space-y-1">
              <li>• <strong>Source</strong>: The record to be deleted (data will be moved from here)</li>
              <li>• <strong>Target</strong>: The record to keep (data will be moved to here)</li>
              <li>• All events, linked IDs, and email aliases will be consolidated</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search and Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" id="source-label">
            <span className="text-red-600 font-semibold">Source</span> (will be deleted)
          </label>
          <div className="relative">
            <input
              type="text"
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
              disabled={!!source}
              aria-labelledby="source-label"
              aria-describedby="source-description"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
              {sourceResults.isLoading && sourceSearch && !source && (
                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true">
                </div>
              )}
              {source && (
                <button
                  onClick={() => setSourceSearch('')}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                  aria-label="Clear search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <span id="source-description" className="sr-only">
            Enter search terms to find supporters. The source record will be deleted after merging.
          </span>

          {sourceSearch && !source && sourceResults.isLoading && (
            <div className="mt-2 flex items-center justify-center p-4 bg-gray-50 rounded-lg">
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-sm text-gray-600">Searching...</span>
            </div>
          )}

          {sourceSearch && !source && !sourceResults.isLoading && (
            <SearchResults
              results={sourceResults.data ?? []}
              onSelect={handleSelectAsTarget}
              onSelectAsSource={handleSelectAsSource}
              excludedIds={[target?.supporter_id ?? '']}
            />
          )}

          {source && (
            <div className="mt-3">
              <SupporterCard
                supporter={source}
                isSelected={true}
                onSelect={() => {}}
                onRemove={handleClearSource}
                label="Source (to delete)"
              />
            </div>
          )}
        </div>

        {/* Target Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" id="target-label">
            <span className="text-green-600 font-semibold">Target</span> (will be kept)
          </label>
          <div className="relative">
            <input
              type="text"
              value={targetSearch}
              onChange={(e) => setTargetSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
              disabled={!!target}
              aria-labelledby="target-label"
              aria-describedby="target-description"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
              {targetResults.isLoading && targetSearch && !target && (
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true">
                </div>
              )}
              {target && (
                <button
                  onClick={() => setTargetSearch('')}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                  aria-label="Clear search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <span id="target-description" className="sr-only">
            Enter search terms to find supporters. The target record will be kept after merging.
          </span>

          {targetSearch && !target && targetResults.isLoading && (
            <div className="mt-2 flex items-center justify-center p-4 bg-gray-50 rounded-lg">
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-sm text-gray-600">Searching...</span>
            </div>
          )}

          {targetSearch && !target && !targetResults.isLoading && (
            <SearchResults
              results={targetResults.data ?? []}
              onSelect={handleSelectAsTarget}
              onSelectAsSource={handleSelectAsSource}
              excludedIds={[source?.supporter_id ?? '']}
            />
          )}

          {target && (
            <div className="mt-3">
              <SupporterCard
                supporter={target}
                isSelected={true}
                onSelect={() => {}}
                onRemove={handleClearTarget}
                label="Target (to keep)"
                isTarget={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Merge Button */}
      {canMerge && (
        <div className="flex justify-center">
          <button
            onClick={handleInitiateMerge}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
            </svg>
            Merge Supporters
          </button>
        </div>
      )}

      {/* Merge Error */}
      {mergeMutation.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="assertive">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-500 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h4 className="font-medium text-red-900">Merge failed</h4>
              <p className="text-sm text-red-700">{mergeMutation.error.message}</p>
              <p className="text-sm text-red-600 mt-2">Please check the supporter records and try again.</p>
            </div>
            <button
              onClick={() => mergeMutation.reset()}
              className="text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
              aria-label="Dismiss error"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmMergeModal
        isOpen={showConfirm}
        source={source!}
        target={target!}
        reason={reason}
        onReasonChange={setReason}
        onConfirm={handleConfirmMerge}
        onCancel={handleCloseConfirm}
        isPending={mergeMutation.isPending}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        targetId={mergedTargetId}
        onClose={handleCloseSuccess}
        onViewAuditLog={handleViewAuditLog}
      />
    </div>
  );
}
