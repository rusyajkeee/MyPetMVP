import { useState, useEffect } from 'react';
import api from '../api/client';

function StatCard({ label, value, icon, color }) {
  const colorMap = {
    violet: 'bg-violet-100 text-admin-primary',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-admin-accent',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap.violet}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function PendingProviderRow({ provider, onVerify, verifying }) {
  const name = [provider.user?.firstName, provider.user?.lastName].filter(Boolean).join(' ') || 'Unnamed';
  const email = provider.user?.email || '';
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold text-admin-primary">
            {(name || email || '?')[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{name}</p>
          <p className="text-xs text-gray-500">{email}</p>
          {provider.businessName && (
            <p className="text-xs text-gray-400 mt-0.5">{provider.businessName}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => onVerify(provider.id)}
        disabled={verifying === provider.id}
        className="px-4 py-1.5 bg-admin-primary hover:bg-admin-dark text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
      >
        {verifying === provider.id ? 'Verifying...' : 'Verify'}
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
    loadPending();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadPending = async () => {
    try {
      const { data } = await api.get('/admin/providers/pending');
      setPending(Array.isArray(data) ? data : data.providers || []);
    } catch (err) {
      console.error('Failed to load pending providers:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleVerify = async (providerId) => {
    setVerifying(providerId);
    setError('');
    try {
      await api.post(`/admin/providers/${providerId}/verify`);
      setPending((prev) => prev.filter((p) => p.id !== providerId));
      loadStats(); // Refresh stats
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify provider');
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Users"
          value={loadingStats ? '...' : stats?.users}
          color="violet"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          label="Verified Providers"
          value={loadingStats ? '...' : stats?.providers}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <StatCard
          label="Pending Verifications"
          value={loadingStats ? '...' : stats?.pendingProviderVerifications}
          color="orange"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Bookings"
          value={loadingStats ? '...' : stats?.bookings}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Pending Providers */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pending Verifications</h2>
              <p className="text-sm text-gray-500 mt-0.5">Providers awaiting approval</p>
            </div>
            {pending.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-admin-accent">
                {pending.length} pending
              </span>
            )}
          </div>
        </div>
        <div className="px-6 py-2">
          {error && (
            <div className="my-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {loadingPending ? (
            <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : pending.length === 0 ? (
            <div className="py-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-sm">No pending verifications</p>
              <p className="text-gray-400 text-xs mt-1">All providers have been reviewed</p>
            </div>
          ) : (
            pending.map((provider) => (
              <PendingProviderRow
                key={provider.id}
                provider={provider}
                onVerify={handleVerify}
                verifying={verifying}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
