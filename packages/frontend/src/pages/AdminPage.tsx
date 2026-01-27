import { useState } from 'react';
import { useMergeSupporters } from '../hooks/useSupporters';

export function AdminPage() {
  const [primaryId, setPrimaryId] = useState('');
  const [secondaryId, setSecondaryId] = useState('');
  const mergeMutation = useMergeSupporters();

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryId || !secondaryId) {
      alert('Please enter both supporter IDs');
      return;
    }
    if (primaryId === secondaryId) {
      alert('Primary and secondary IDs must be different');
      return;
    }
    try {
      await mergeMutation.mutateAsync({ primaryId, secondaryId });
      alert('Supporters merged successfully');
      setPrimaryId('');
      setSecondaryId('');
    } catch (error) {
      alert(`Merge failed: ${(error as Error).message}`);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Admin Panel</h2>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium mb-4">Merge Supporters</h3>
        <form onSubmit={handleMerge} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Supporter ID (to keep)
            </label>
            <input
              type="text"
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="UUID of supporter to keep"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Supporter ID (to merge)
            </label>
            <input
              type="text"
              value={secondaryId}
              onChange={(e) => setSecondaryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="UUID of supporter to merge"
            />
          </div>
          <button
            type="submit"
            disabled={mergeMutation.isPending}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            {mergeMutation.isPending ? 'Merging...' : 'Merge Supporters'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Audit Log</h3>
        <p className="text-gray-500">Coming soon</p>
      </div>
    </div>
  );
}
