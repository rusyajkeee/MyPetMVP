import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProviderProfile() {
  const { user } = useAuth();
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    api.get(`/providers/${id}`)
      .then(({ data }) => setProvider(data))
      .catch(() => setProvider(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    api.get('/users/favorites/ids')
      .then(({ data }) => setFavorite(Array.isArray(data) && data.includes(id)))
      .catch(() => setFavorite(false));
  }, [user, id]);

  async function toggleFavorite() {
    if (!user) return;
    if (favorite) await api.delete(`/users/favorites/${id}`);
    else await api.post('/users/favorites', { providerId: id });
    setFavorite((current) => !current);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-mypet-green h-20 rounded-b-3xl animate-pulse" />
        <div className="px-5 -mt-4 space-y-4">
          <div className="bg-white rounded-3xl shadow-lg h-64 animate-pulse" />
          <div className="h-12 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center">
        <p className="text-4xl mb-3">😕</p>
        <p className="text-gray-500">Provider not found.</p>
        <Link to="/discover" className="mt-4 inline-block text-mypet-green font-medium">← Back to Discover</Link>
      </div>
    );
  }

  const name = provider.user
    ? `${provider.user.firstName} ${provider.user.lastName}`
    : provider.businessName || 'Provider';
  const avgRating = provider.avgRating != null ? Number(provider.avgRating).toFixed(1) : '5.0';
  const reviewCount = provider.reviewCount ?? 0;
  const firstService = provider.services?.[0];

  return (
    <div className="max-w-lg mx-auto">
      {/* Green header */}
      <div className="bg-mypet-green px-5 pt-10 pb-6 flex items-center gap-3 rounded-b-[2.5rem]">
        <Link to="/discover" className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition">
          ‹
        </Link>
        <h1 className="text-white text-lg font-bold flex-1 truncate">{name}</h1>
      </div>

      <div className="px-5 -mt-4 pb-32">
        {/* Hero image card */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="h-52 bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
            {provider.user?.avatarUrl ? (
              <img src={provider.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-7xl">🩺</span>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-gray-900">{name}</h2>
              {user && (
                <button
                  type="button"
                  onClick={toggleFavorite}
                  className={`h-9 w-9 rounded-full text-sm font-bold ${favorite ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'}`}
                  title={favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  ♥
                </button>
              )}
            </div>
            {(provider.isVerified || provider.verified) && (
              <span className="inline-flex mt-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                Verified provider
              </span>
            )}
            {firstService && (
              <p className="text-mypet-green font-medium text-sm mt-0.5">{firstService.title}</p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                <span className="font-bold text-gray-900">{avgRating}</span>
                <span className="text-sm text-gray-400">({reviewCount})</span>
              </div>
              {provider.address && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span>📍</span>
                  <span className="truncate max-w-[140px]">{provider.address}</span>
                </div>
              )}
            </div>

            {/* Services list */}
            {provider.services && provider.services.length > 0 && (
              <div className="mt-4 space-y-2">
                {provider.services.map((s) => (
                  <div key={s.id} className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-2">
                    <span className="text-sm font-medium text-gray-700">{s.title}</span>
                    <span className="text-sm font-bold text-mypet-green">{s.priceKzt?.toLocaleString()} ₸</span>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {provider.description && (
              <p className="text-gray-600 text-sm mt-4 leading-relaxed">{provider.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-20 inset-x-0 px-5 max-w-lg mx-auto left-0 right-0">
        <Link
          to={`/provider/${id}/book`}
          className="block w-full py-4 rounded-2xl bg-mypet-green text-white text-center font-bold text-base shadow-lg shadow-green-200 hover:bg-mypet-green-dark transition"
        >
          Book an Appointment
        </Link>
      </div>
    </div>
  );
}
