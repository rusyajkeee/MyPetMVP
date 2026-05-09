import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { slug: 'VETERINARY', label: 'Veterinary', emoji: '🩺', color: 'bg-blue-50' },
  { slug: 'GROOMING', label: 'Grooming', emoji: '✂️', color: 'bg-pink-50' },
  { slug: 'BOARDING', label: 'Boarding', emoji: '🏠', color: 'bg-amber-50' },
];

function ProviderCard({ p, favorite, onToggleFavorite, canFavorite }) {
  const name = p.user ? `${p.user.firstName} ${p.user.lastName}` : p.businessName || 'Provider';
  const avgRating = p.avgRating != null ? Number(p.avgRating).toFixed(1) : '5.0';
  const reviewCount = p.reviewCount ?? 0;
  const firstService = p.services?.[0];

  return (
    <Link
      to={`/provider/${p.id}`}
      className="block bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition mb-4"
    >
      <div className="flex gap-4 items-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex-shrink-0 overflow-hidden">
          {p.user?.avatarUrl ? (
            <img src={p.user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🩺</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{name}</h3>
          {firstService && (
            <p className="text-sm text-gray-500 truncate">{firstService.title}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-sm">★</span>
              <span className="text-sm font-semibold text-gray-800">{avgRating}</span>
              <span className="text-xs text-gray-400">({reviewCount})</span>
            </div>
            {firstService?.priceKzt && (
              <span className="text-xs text-mypet-green font-medium bg-green-50 px-2 py-0.5 rounded-full">
                from {firstService.priceKzt.toLocaleString()} ₸
              </span>
            )}
          </div>
          {p.address && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {p.address}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canFavorite && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onToggleFavorite?.(p.id, !favorite);
              }}
              className={`h-8 w-8 rounded-full text-sm font-bold ${favorite ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'}`}
              title={favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              ♥
            </button>
          )}
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full flex-shrink-0">OPEN</span>
        </div>
      </div>
    </Link>
  );
}

export default function Discover() {
  const { user } = useAuth();
  const { category: categoryParam } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(categoryParam || 'VETERINARY');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState([]);

  useEffect(() => {
    if (categoryParam) setCategory(categoryParam);
  }, [categoryParam]);

  useEffect(() => {
    setLoading(true);
    let cancelled = false;
    api.get('/providers', { params: { category } })
      .then(({ data }) => { if (!cancelled) setProviders(data); })
      .catch(() => { if (!cancelled) setProviders([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category]);

  useEffect(() => {
    if (!user) return;
    api.get('/users/favorites/ids')
      .then(({ data }) => setFavoriteIds(Array.isArray(data) ? data : []))
      .catch(() => setFavoriteIds([]));
  }, [user]);

  async function handleFavorite(providerId, nextState) {
    if (!user) return;
    if (nextState) await api.post('/users/favorites', { providerId });
    else await api.delete(`/users/favorites/${providerId}`);
    setFavoriteIds((current) => nextState ? Array.from(new Set([...current, providerId])) : current.filter((id) => id !== providerId));
  }

  function handleCategoryChange(slug) {
    setCategory(slug);
    navigate(`/discover/${slug}`, { replace: true });
  }

  const catInfo = CATEGORIES.find((c) => c.slug === category) || CATEGORIES[0];

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-mypet-green px-6 pt-10 pb-6 rounded-b-[2.5rem]">
        <p className="text-green-200 text-sm font-medium mb-1">Hello there 👋</p>
        <h1 className="text-white text-2xl font-bold leading-tight">How may we<br />help you?</h1>

        {/* Category pills */}
        <div className="flex gap-3 mt-5 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => handleCategoryChange(c.slug)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
                category === c.slug
                  ? 'bg-white text-mypet-green shadow-lg'
                  : 'bg-white/20 text-white'
              }`}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Nearby {catInfo.label}
        </h2>
        <p className="text-sm text-gray-500 mb-4">Top-rated specialists near you</p>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">{catInfo.emoji}</p>
            <p className="text-gray-500">No providers found in this category.</p>
          </div>
        ) : (
          providers.map((p) => (
            <ProviderCard
              key={p.id}
              p={p}
              canFavorite={Boolean(user)}
              favorite={favoriteIds.includes(p.id)}
              onToggleFavorite={handleFavorite}
            />
          ))
        )}
      </div>
    </div>
  );
}
