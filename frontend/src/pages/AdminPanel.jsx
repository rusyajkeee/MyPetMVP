import { useState, useEffect } from 'react';
import api from '../api/client';

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats').then((r) => r.data),
      api.get('/admin/providers/pending').then((r) => r.data),
    ])
      .then(([s, p]) => {
        setStats(s);
        setPending(p);
      })
      .finally(() => setLoading(false));
  }, []);

  async function verifyProvider(providerId) {
    await api.post(`/admin/providers/${providerId}/verify`);
    setPending((prev) => prev.filter((p) => p.id !== providerId));
    setStats((s) => s ? { ...s, providers: s.providers + 1, pendingProviderVerifications: s.pendingProviderVerifications - 1 } : null);
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-mypet-green text-white px-6 py-6 rounded-b-3xl">
        <h1 className="text-xl font-bold">Admin</h1>
      </header>
      <div className="px-6 py-6 space-y-6">
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 shadow">
              <p className="text-2xl font-bold text-gray-900">{stats.users}</p>
              <p className="text-sm text-gray-500">Users</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow">
              <p className="text-2xl font-bold text-gray-900">{stats.providers}</p>
              <p className="text-sm text-gray-500">Providers</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow">
              <p className="text-2xl font-bold text-gray-900">{stats.bookings}</p>
              <p className="text-sm text-gray-500">Bookings</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow">
              <p className="text-2xl font-bold text-gray-900">{stats.pendingProviderVerifications}</p>
              <p className="text-sm text-gray-500">Pending verification</p>
            </div>
          </div>
        )}

        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Pending provider verification</h2>
          {pending.length === 0 ? (
            <p className="text-gray-500 text-sm">None</p>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <div key={p.id} className="bg-white rounded-xl p-4 shadow flex justify-between items-center">
                  <div>
                    <p className="font-medium">{p.user?.firstName} {p.user?.lastName}</p>
                    <p className="text-sm text-gray-500">{p.user?.email}</p>
                  </div>
                  <button
                    onClick={() => verifyProvider(p.id)}
                    className="py-1.5 px-3 rounded-lg bg-mypet-green text-white text-sm font-medium"
                  >
                    Verify
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
