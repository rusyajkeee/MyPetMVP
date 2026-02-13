import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';

export default function ProviderProfile() {
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/providers/${id}`)
      .then(({ data }) => setProvider(data))
      .catch(() => setProvider(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!provider) return <div className="p-6 text-center text-gray-500">Provider not found.</div>;

  const name = provider.user ? `${provider.user.firstName} ${provider.user.lastName}` : provider.businessName || 'Provider';
  const avgRating = provider.avgRating != null ? provider.avgRating.toFixed(1) : '5.0';
  const reviewCount = provider.reviewCount ?? 100;

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-mypet-green text-white px-6 py-6 flex items-center gap-4">
        <Link to="/discover" className="text-white p-1">←</Link>
        <h1 className="text-xl font-bold flex-1 truncate">{name}</h1>
      </header>
      <div className="px-6 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="h-48 bg-gray-200 flex items-center justify-center">
            {provider.user?.avatarUrl ? (
              <img src={provider.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl text-gray-400">👤</span>
            )}
          </div>
          <div className="p-4">
            <h2 className="text-lg font-bold text-gray-900">{name}</h2>
            {provider.services?.[0] && (
              <p className="text-gray-600 text-sm">{provider.services[0].title}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-yellow-500">★★★★★</span>
              <span className="font-medium">{avgRating}</span>
              <span className="text-gray-500 text-sm">({reviewCount} reviews)</span>
            </div>
            {provider.address && (
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                <span>📍</span> {provider.address}
              </p>
            )}
            {provider.services?.map((s) => (
              <p key={s.id} className="text-sm font-medium text-gray-700 mt-2">
                {s.priceKzt?.toLocaleString()} KZT for {s.title}
              </p>
            ))}
            {provider.description && (
              <p className="text-gray-600 text-sm mt-4">{provider.description}</p>
            )}
          </div>
        </div>
        <Link
          to={`/provider/${id}/book`}
          className="mt-6 block w-full py-3 rounded-xl bg-mypet-green text-white text-center font-semibold"
        >
          Book an Appointment
        </Link>
      </div>
    </div>
  );
}
