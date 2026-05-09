import { Link } from 'react-router-dom';

export default function MapProviderCard({ p }) {
  const name = p.user ? `${p.user.firstName} ${p.user.lastName}` : p.businessName || 'Provider';
  const avgRating = p.rating != null ? Number(p.rating).toFixed(1) : (p.avgRating != null ? Number(p.avgRating).toFixed(1) : 'New');
  const reviewCount = p.reviewCount ?? 0;
  const firstService = p.services?.[0];

  return (
    <Link
      to={`/provider/${p.id}`}
      className="flex-shrink-0 w-72 bg-white rounded-2xl p-4 shadow-md mr-4 snap-center transition-transform"
    >
      <div className="flex gap-4 items-center">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
          {p.user?.avatarUrl ? (
            <img src={p.user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">📍</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{name}</h3>
          {p.isVerified && <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Verified</p>}
          
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-sm">★</span>
              <span className="text-xs font-semibold text-gray-800">{avgRating}</span>
              <span className="text-[10px] text-gray-400">({reviewCount})</span>
            </div>
            
            <span className="text-xs font-medium text-mypet-green bg-green-50 px-1.5 py-0.5 rounded">
               {p.distanceKm} km away
            </span>
          </div>
          {firstService?.priceKzt && (
            <p className="text-xs text-gray-500 mt-1 truncate">from {firstService.priceKzt.toLocaleString()} ₸</p>
          )}
        </div>
      </div>
    </Link>
  );
}
