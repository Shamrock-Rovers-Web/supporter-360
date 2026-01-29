import { useState } from 'react';
import { useSearch } from '../hooks/useSupporters';
import { SearchBar } from '../components/search/SearchBar';
import { SearchResultCard } from '../components/search/SearchResultCard';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const { data: results, isLoading, error } = useSearch(query);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Search Supporters</h2>
      <SearchBar onSearch={setQuery} loading={isLoading} />

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-4">
          {error.message}
        </div>
      )}

      {query && results && (
        <div className="space-y-3">
          <p className="text-gray-600">{results.length} results found</p>
          {results.length > 0 ? (
            results.map((result: any) => (
              <SearchResultCard key={result.supporter_id} result={result} />
            ))
          ) : (
            <p className="text-gray-500">No supporters found matching "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
}
