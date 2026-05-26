import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { slug: 'VETERINARY', label: 'Veterinary', emoji: '🩺' },
  { slug: 'GROOMING', label: 'Grooming', emoji: '✂️' },
  { slug: 'BOARDING', label: 'Boarding', emoji: '🏠' },
  { slug: 'WALKING', label: 'Walking', emoji: '🐕' },
  { slug: 'TRAINING', label: 'Training', emoji: '🎯' },
];

function ProviderCard({ p, favorite, onToggleFavorite, canFavorite }) {
  const name = p.user ? `${p.user.firstName} ${p.user.lastName}` : p.businessName || 'Provider';
  const avgRating = p.avgRating != null ? Number(p.avgRating).toFixed(1) : null;
  const firstService = p.services?.[0];

  return (
    <Link to={`/provider/${p.id}`} className="block bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition mb-3">
      <div className="flex gap-4 items-center">
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl">
          {p.user?.avatarUrl ? <img src={p.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : '🩺'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{name}</h3>
          {firstService && <p className="text-sm text-gray-500 truncate">{firstService.title}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {avgRating && (
              <span className="text-sm font-semibold text-gray-800">★ {avgRating}</span>
            )}
            {firstService?.priceKzt && (
              <span className="text-xs text-mypet-green font-medium bg-green-50 px-2 py-0.5 rounded-full">
                от {firstService.priceKzt.toLocaleString()} ₸
              </span>
            )}
          </div>
          {p.address && <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {p.address}</p>}
        </div>
        {canFavorite && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onToggleFavorite?.(p.id, !favorite); }}
            className={`h-8 w-8 rounded-full text-sm ${favorite ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'}`}
          >♥</button>
        )}
      </div>
    </Link>
  );
}

function ServiceCard({ item }) {
  return (
    <Link to={`/provider/${item.provider.id}`} className="block bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition mb-3">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{item.title}</h3>
          <p className="text-sm text-mypet-green font-medium truncate">{item.provider.businessName}</p>
          {item.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {item.provider.avgRating && (
              <span className="text-xs text-gray-600 font-medium">★ {item.provider.avgRating.toFixed(1)}</span>
            )}
            {item.provider.distanceKm != null && (
              <span className="text-xs text-gray-400">📍 {item.provider.distanceKm} km</span>
            )}
            {item.durationMin && (
              <span className="text-xs text-gray-400">⏱ {item.durationMin} min</span>
            )}
          </div>
        </div>
        {item.priceKzt && (
          <span className="flex-shrink-0 text-sm font-bold text-mypet-green bg-green-50 px-3 py-1 rounded-xl">
            {item.priceKzt.toLocaleString()} ₸
          </span>
        )}
      </div>
      {item.provider.address && (
        <p className="text-xs text-gray-400 mt-2 truncate">📍 {item.provider.address}</p>
      )}
    </Link>
  );
}

export default function Discover() {
  const { user } = useAuth();
  const { category: categoryParam } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(categoryParam || '');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => { if (categoryParam) setCategory(categoryParam); }, [categoryParam]);

  useEffect(() => {
    setLoading(true);
    let cancelled = false;
    const params = category ? { category } : {};
    api.get('/providers', { params })
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

  function handleSearchChange(e) {
    const text = e.target.value;
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      api.get('/services/search', { params: { q: text.trim() } })
        .then(({ data }) => setSearchResults(data))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 400);
  }

  async function handleFavorite(providerId, nextState) {
    if (!user) return;
    if (nextState) await api.post('/users/favorites', { providerId });
    else await api.delete(`/users/favorites/${providerId}`);
    setFavoriteIds((cur) => nextState ? [...new Set([...cur, providerId])] : cur.filter((id) => id !== providerId));
  }

  function handleCategoryChange(slug) {
    setCategory(slug === category ? '' : slug);
    navigate(slug === category ? '/discover' : `/discover/${slug}`, { replace: true });
  }

  const isSearching = searchQuery.trim().length >= 2;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-mypet-green px-6 pt-10 pb-6 rounded-b-[2.5rem]">
        <p className="text-green-200 text-sm font-medium mb-1">Hello 👋</p>
        <h1 className="text-white text-2xl font-bold leading-tight mb-4">Find a service</h1>

        {/* Search bar */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search service (e.g. grooming, vaccination…)"
            className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >✕</button>
          )}
        </div>

        {/* Category pills */}
        {!isSearching && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((c) => (
              <button
                key={c.slug}
                onClick={() => handleCategoryChange(c.slug)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  category === c.slug ? 'bg-white text-mypet-green shadow' : 'bg-white/20 text-white'
                }`}
              >
                <span>{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-5">
        {isSearching ? (
          <>
            <p className="text-sm font-bold text-gray-700 mb-3">
              {searching ? 'Searching…' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
            </p>
            {searching ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-20" />
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-gray-500 font-medium">Nothing found</p>
                <p className="text-gray-400 text-sm">Try different keywords</p>
              </div>
            ) : (
              searchResults.map((item) => <ServiceCard key={item.id} item={item} />)
            )}
          </>
        ) : (
          <>
            <h2 className="text-base font-bold text-gray-900 mb-1">
              {category ? `${CATEGORIES.find((c) => c.slug === category)?.label ?? category} providers` : 'All providers'}
            </h2>
            <p className="text-sm text-gray-400 mb-4">Top-rated specialists</p>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No providers found.</p>
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
          </>
        )}
      </div>
    </div>
  );
}
