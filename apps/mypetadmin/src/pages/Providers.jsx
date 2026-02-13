import { useState, useEffect } from 'react';
import api from '../api/client';

function ProviderCard({ provider, onVerify, verifying }) {
  const name = [provider.user?.firstName, provider.user?.lastName].filter(Boolean).join(' ') || 'Unnamed';
  const email = provider.user?.email || '';
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-base font-semibold text-admin-primary">
              {(name || email || '?')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{name}</h3>
            <p className="text-xs text-gray-500 truncate">{email}</p>
          </div>
        </div>
        {onVerify && (
          <button
            onClick={() => onVerify(provider.id)}
            disabled={verifying === provider.id}
            className="px-4 py-1.5 bg-admin-primary hover:bg-admin-dark text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            {verifying === provider.id ? 'Verifying...' : 'Verify'}
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {provider.businessName && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>{provider.businessName}</span>
          </div>
        )}
        {provider.services && provider.services.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>{provider.services.length} service{provider.services.length !== 1 ? 's' : ''}</span>
          </div>
        )}
        {provider._count?.services != null && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>{provider._count.services} service{provider._count.services !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Providers() {
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/providers/pending');
      setPending(Array.isArray(data) ? data : data.providers || []);
    } catch (err) {
      console.error('Failed to load pending providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllProviders = async () => {
    setLoadingAll(true);
    try {
      const { data } = await api.get('/admin/providers');
      setAllProviders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load providers:', err);
    } finally {
      setLoadingAll(false);
    }
  };

  const handleVerify = async (providerId) => {
    setVerifying(providerId);
    setError('');
    try {
      await api.post(`/admin/providers/${providerId}/verify`);
      setPending((prev) => prev.filter((p) => p.id !== providerId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify provider');
    } finally {
      setVerifying(null);
    }
  };

  const tabs = [
    { id: 'pending', label: 'Pending Verification' },
    { id: 'all', label: 'All Providers' },
  ];

  const handleTabChange = (t) => {
    setTab(t);
    if (t === 'all' && allProviders.length === 0) loadAllProviders();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
        <p className="text-gray-500 mt-1">Manage service provider accounts</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.id === 'pending' && pending.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-admin-accent text-white rounded-full">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Pending Tab */}
      {tab === 'pending' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading pending providers...</div>
          ) : pending.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
              <p className="text-gray-500 text-sm">No providers are waiting for verification.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {pending.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onVerify={handleVerify}
                  verifying={verifying}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* All Providers Tab */}
      {tab === 'all' && (
        <>
          {loadingAll ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading all providers...</div>
          ) : allProviders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No providers</h3>
              <p className="text-gray-500 text-sm">No provider accounts in the system yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {allProviders.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
