import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';

const CATEGORIES = [
  { slug: 'VETERINARY', label: 'Veterinary' },
  { slug: 'GROOMING', label: 'Grooming' },
  { slug: 'BOARDING', label: 'Boarding' },
];

function ProviderCard({ p }) {
  const name = p.user ? `${p.user.firstName} ${p.user.lastName}` : p.businessName || 'Provider';
  const rating = 5.0;
  const reviewCount = 100;

  return (
    <Link
      to={`/provider/${p.id}`}
      className="block bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition mb-4"
    >
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
          {p.user?.avatarUrl ? (
            <img src={p.user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">👤</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
          {p.services?.[0] && (
            <p className="text-sm text-gray-500 truncate">{p.services[0].title}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-yellow-500">★</span>
            <span className="text-sm font-medium">{rating}</span>
            <span className="text-sm text-gray-500">({reviewCount} reviews)</span>
          </div>
          {p.address && <p className="text-sm text-gray-500 mt-0.5">{p.address}</p>}
          <span className="inline-block mt-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">OPEN</span>
        </div>
      </div>
    </Link>
  );
}

export default function Discover() {
  const { category: categoryParam } = useParams();
  const [category, setCategory] = useState(categoryParam || 'VETERINARY');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryParam) setCategory(categoryParam);
  }, [categoryParam]);

  useEffect(() => {
    let cancelled = false;
    api.get('/providers', { params: { category } }).then(({ data }) => {
      if (!cancelled) setProviders(data);
    }).catch(() => {
      if (!cancelled) setProviders([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [category]);

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-mypet-green text-white px-6 py-6 rounded-b-3xl">
        <h1 className="text-xl font-bold capitalize">{category.toLowerCase()}</h1>
      </header>
      <div className="px-6 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => setCategory(c.slug)}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition ${
                category === c.slug ? 'bg-mypet-green text-white' : 'bg-white text-gray-700 shadow'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <h2 className="text-lg font-semibold mt-6 mb-3">Nearby {category.toLowerCase()}</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : providers.length === 0 ? (
          <p className="text-gray-500">No providers found. Try another category.</p>
        ) : (
          providers.map((p) => <ProviderCard key={p.id} p={p} />)
        )}
      </div>
    </div>
  );
}
