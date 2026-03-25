import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchForMerge, useMergeSupporters } from '../../hooks/useSupporters';
import { SupporterType } from '@supporter360/shared';
import { Badge, getSupporterTypeBadgeVariant } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

// Format date helper
function formatDate(date: string | null): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}


interface SupporterForMerge {
  supporter_id: string;
  name: string | null;
  primary_email: string | null;
  supporter_type: SupporterType;
  last_ticket_order_date: string | null;
  last_shop_order_date: string | null;
  membership_status: string | null;
}

function SupporterCard({
  supporter,
  isTarget,
  onClear,
}: {
  supporter: SupporterForMerge;
  isTarget: boolean;
  onClear: () => void;
}) {
  return (
    <Card
      variant="outlined"
      className={`${
        isTarget ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <span
            className={`text-xs font-medium uppercase tracking-wide ${
              isTarget ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isTarget ? 'Target (keep)' : 'Source (delete)'}
          </span>
          <h4 className="text-lg font-semibold text-gray-900 mt-1">
            {supporter.name || 'Unknown Name'}
          </h4>
          <p className="text-sm text-gray-600">{supporter.primary_email || 'No email'}</p>
          <div className="mt-2">
            <Badge variant={getSupporterTypeBadgeVariant(supporter.supporter_type)} size="sm">
              {supporter.supporter_type}
            </Badge>
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Clear selection"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Last Ticket:</span>
          <p className="font-medium">{formatDate(supporter.last_ticket_order_date)}</p>
        </div>
        <div>
          <span className="text-gray-500">Last Shop:</span>
          <p className="font-medium">{formatDate(supporter.last_shop_order_date)}</p>
        </div>
        <div>
          <span className="text-gray-500">Member:</span>
          <p className="font-medium">{supporter.membership_status || 'No'}</p>
        </div>
      </div>
      <p className="text-xs font-mono text-gray-400 mt-3">
        ID: {supporter.supporter_id.slice(0, 8)}...
      </p>
    </Card>
  );
}

function SearchResults({
  results,
  onSelectAsSource,
  onSelectAsTarget,
  excludedIds,
}: {
  results: SupporterForMerge[];
  onSelectAsSource: (s: SupporterForMerge) => void;
  onSelectAsTarget: (s: SupporterForMerge) => void;
  excludedIds: string[];
}) {
  const filtered = results.filter((r) => !excludedIds.includes(r.supporter_id));

  if (filtered.length === 0) {
    return (
      <Card variant="outlined" className="text-center py-4">
        <p className="text-gray-500">No results found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((supporter) => (
        <Card
          key={supporter.supporter_id}
          variant="outlined"
          className="hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-gray-900">
                {supporter.name || 'Unknown Name'}
              </h4>
              <p className="text-sm text-gray-500">
                {supporter.primary_email || 'No email'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectAsSource(supporter)}
                className="text-red-600 hover:text-red-700"
              >
                Source
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectAsTarget(supporter)}
                className="text-green-600 hover:text-green-700"
              >
                Target
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function MergeSupporters() {
  const navigate = useNavigate();
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [source, setSource] = useState<SupporterForMerge | null>(null);
  const [target, setTarget] = useState<SupporterForMerge | null>(null);
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const sourceResults = useSearchForMerge(sourceSearch);
  const targetResults = useSearchForMerge(targetSearch);
  const mergeMutation = useMergeSupporters();

  const canMerge = source && target && source.supporter_id !== target.supporter_id;

  const handleSelectAsSource = useCallback((supporter: SupporterForMerge) => {
    setSource(supporter);
    setSourceSearch('');
  }, []);

  const handleSelectAsTarget = useCallback((supporter: SupporterForMerge) => {
    setTarget(supporter);
    setTargetSearch('');
  }, []);

  const handleInitiateMerge = useCallback(() => {
    if (!source || !target) return;
    setShowConfirm(true);
  }, [source, target]);

  const handleConfirmMerge = useCallback(async () => {
    if (!source || !target || !reason.trim()) return;

    setIsMerging(true);
    try {
      await mergeMutation.mutateAsync({
        sourceId: source.supporter_id,
        targetId: target.supporter_id,
        reason: reason.trim(),
      });

      // Navigate to the target supporter's profile
      navigate(`/supporters/${target.supporter_id}`);
    } catch (error) {
      console.error('Merge failed:', error);
    } finally {
      setIsMerging(false);
      setShowConfirm(false);
    }
  }, [source, target, reason, mergeMutation, navigate]);

  const handleClearSource = useCallback(() => {
    setSource(null);
    setSourceSearch('');
  }, []);

  const handleClearTarget = useCallback(() => {
    setTarget(null);
    setTargetSearch('');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Merge Supporters</h2>
        <p className="text-gray-600 mt-1">
          Combine duplicate supporter records into a single unified record.
        </p>
      </div>

      {/* Info Banner */}
      <Card variant="outlined" className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
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
              <li>
                <strong className="text-red-700">Source</strong>: The record to be deleted
              </li>
              <li>
                <strong className="text-green-700">Target</strong>: The record to keep
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Search and Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="text-red-600 font-semibold">Source</span> (will be deleted)
          </label>
          {source ? (
            <SupporterCard
              supporter={source}
              isTarget={false}
              onClear={handleClearSource}
            />
          ) : (
            <>
              <Input
                type="text"
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                placeholder="Search by name, email, or phone..."
              />
              {sourceSearch && sourceResults.data && (
                <div className="mt-3">
                  <SearchResults
                    results={sourceResults.data ?? []}
                    onSelectAsSource={handleSelectAsSource}
                    onSelectAsTarget={handleSelectAsTarget}
                    excludedIds={[target?.supporter_id ?? '']}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Target Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="text-green-600 font-semibold">Target</span> (will be kept)
          </label>
          {target ? (
            <SupporterCard
              supporter={target}
              isTarget={true}
              onClear={handleClearTarget}
            />
          ) : (
            <>
              <Input
                type="text"
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                placeholder="Search by name, email, or phone..."
              />
              {targetSearch && targetResults.data && (
                <div className="mt-3">
                  <SearchResults
                    results={targetResults.data ?? []}
                    onSelectAsSource={handleSelectAsSource}
                    onSelectAsTarget={handleSelectAsTarget}
                    excludedIds={[source?.supporter_id ?? '']}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Merge Actions */}
      {source && target && (
        <Card variant="elevated">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Merge Details</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for merge <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Duplicate records for the same supporter"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green-500 focus:border-transparent"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleInitiateMerge}
              disabled={!canMerge || !reason.trim()}
            >
              Merge Supporters
            </Button>
          </div>
        </Card>
      )}

      {/* Confirmation Modal */}
      {showConfirm && source && target && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card variant="elevated" className="max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Merge</h3>
            <div className="space-y-4 mb-6">
              <p className="text-gray-600">
                Are you sure you want to merge these supporters? This action cannot be undone.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> The source record will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                disabled={isMerging}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmMerge}
                loading={isMerging}
              >
                {isMerging ? 'Merging...' : 'Confirm Merge'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default MergeSupporters;
