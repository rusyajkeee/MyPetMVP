import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PROVIDERS } from '../data/providers';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeIcon(color) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const ICONS = {
  VETERINARY: makeIcon('blue'),
  GROOMING: makeIcon('green'),
  BOARDING: makeIcon('orange'),
  TRAINING: makeIcon('violet'),
  SHELTER: makeIcon('red'),
};

const USER_ICON = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const CATEGORIES = [
  { slug: 'VETERINARY', label: 'Ветклиники', emoji: '🩺' },
  { slug: 'GROOMING', label: 'Груминг', emoji: '✂️' },
  { slug: 'BOARDING', label: 'Передержка', emoji: '🏠' },
  { slug: 'TRAINING', label: 'Тренировки', emoji: '🦮' },
  { slug: 'SHELTER', label: 'Приюты', emoji: '🐾' },
];

const RADIUS_OPTIONS = [1, 2, 3, 5, 10];
const ASTANA_CENTER = [51.18, 71.446];

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

function Stars({ rating }) {
  if (!rating) return <span className="text-xs text-gray-400">Нет оценки</span>;
  return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-gray-800">
      <span className="text-yellow-400">★</span>
      {Number(rating).toFixed(1)}
    </span>
  );
}

export default function NearbyMap() {
  const [userLoc, setUserLoc] = useState(ASTANA_CENTER);
  const [locationLoaded, setLocationLoaded] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [category, setCategory] = useState('VETERINARY');
  const [radius, setRadius] = useState(5);
  const [topRated, setTopRated] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Геолокация не поддерживается браузером. Показывается центр Астаны.');
      setLocationLoaded(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLoc([pos.coords.latitude, pos.coords.longitude]);
        setLocationLoaded(true);
      },
      () => {
        setLocationError('Не удалось определить местоположение. Показывается центр Астаны.');
        setLocationLoaded(true);
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  }, []);

  const filtered = useMemo(() => {
    let list = PROVIDERS
      .filter(p => p.categories.includes(category))
      .map(p => ({ ...p, distanceKm: haversine(userLoc[0], userLoc[1], p.lat, p.lng) }))
      .filter(p => p.distanceKm <= radius);

    if (topRated) list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else list.sort((a, b) => a.distanceKm - b.distanceKm);

    return list;
  }, [userLoc, category, radius, topRated]);

  if (!locationLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 pb-20 bg-gray-50">
        <div className="w-10 h-10 border-4 border-mypet-green border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">Определение местоположения...</p>
      </div>
    );
  }

  const catInfo = CATEGORIES.find(c => c.slug === category);

  return (
    <div className="h-[calc(100vh-64px)] w-full relative flex flex-col bg-gray-100">

      {/* Filters overlay */}
      <div className="absolute top-0 left-0 right-0 z-[400] bg-white/95 backdrop-blur-md shadow-sm px-4 pt-5 pb-3 max-w-lg mx-auto rounded-b-3xl">
        <h1 className="text-lg font-bold text-gray-900 mb-3">Рядом с вами</h1>

        {locationError && (
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl mb-3">{locationError}</p>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
          {CATEGORIES.map(c => (
            <button
              key={c.slug}
              onClick={() => { setCategory(c.slug); setSelected(null); }}
              className={`flex-shrink-0 snap-center px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                category === c.slug
                  ? 'bg-mypet-green text-white border-mypet-green shadow'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Radius + top-rated row */}
        <div className="flex flex-wrap gap-2 items-center mt-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Радиус:</span>
          {RADIUS_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-2.5 py-0.5 text-xs rounded-full font-medium transition-colors ${
                radius === r ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r} км
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={topRated}
              onChange={e => setTopRated(e.target.checked)}
              className="rounded border-gray-300 text-mypet-green focus:ring-mypet-green"
            />
            По рейтингу
          </label>
        </div>

        {/* Results count */}
        <p className="text-xs text-gray-400 mt-1.5">
          {filtered.length === 0
            ? `Нет ${catInfo?.label.toLowerCase()} в радиусе ${radius} км`
            : `Найдено: ${filtered.length} ${catInfo?.label.toLowerCase()}`}
        </p>
      </div>

      {/* Map */}
      <div className="flex-1 w-full relative z-0">
        <MapContainer
          center={userLoc}
          zoom={13}
          scrollWheelZoom
          className="w-full h-full"
          zoomControl={false}
        >
          <ChangeView center={userLoc} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Radius circle */}
          <Circle
            center={userLoc}
            radius={radius * 1000}
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.05, weight: 1.5, dashArray: '6 4' }}
          />

          {/* User marker */}
          <Marker position={userLoc} icon={USER_ICON}>
            <Popup>
              <div className="text-center text-sm">
                <span className="font-bold text-mypet-green block">Вы здесь</span>
                <span className="text-xs text-gray-500">Радиус: {radius} км</span>
              </div>
            </Popup>
          </Marker>

          {/* Provider markers */}
          {filtered.map(p => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={ICONS[p.categories[0]] || ICONS.VETERINARY}
              eventHandlers={{ click: () => setSelected(p) }}
            >
              <Popup>
                <div className="min-w-[200px] max-w-[240px]">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug">{p.name}</h3>
                  {p.desc && <p className="text-xs text-gray-500 mb-1">{p.desc}</p>}
                  <p className="text-xs text-gray-600 mb-2">📍 {p.address}</p>

                  <div className="flex items-center justify-between mb-2 text-xs">
                    <Stars rating={p.rating} />
                    <span className="text-gray-400">({p.reviews} отз.)</span>
                    <span className="font-semibold text-mypet-green bg-green-50 px-1.5 py-0.5 rounded">
                      {p.distanceKm.toFixed(1)} км
                    </span>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {p.whatsapp && (
                      <a
                        href={p.whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-green-500 text-white text-xs font-medium py-1.5 rounded-lg text-center"
                      >
                        WhatsApp
                      </a>
                    )}
                    {p.instagram && (
                      <a
                        href={p.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-pink-500 text-white text-xs font-medium py-1.5 rounded-lg text-center"
                      >
                        Instagram
                      </a>
                    )}
                    {p.phone && !p.whatsapp && (
                      <a
                        href={`tel:+${p.phone}`}
                        className="flex-1 bg-mypet-green text-white text-xs font-medium py-1.5 rounded-lg text-center"
                      >
                        Позвонить
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Bottom cards */}
      <div className="absolute bottom-4 w-full z-[400] left-0 right-0 max-w-lg mx-auto pointer-events-none">
        {filtered.length === 0 ? (
          <div className="mx-4 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-lg border border-gray-100 text-center pointer-events-auto">
            <span className="block text-2xl mb-1">{catInfo?.emoji}</span>
            <span className="font-semibold text-gray-800 text-sm">Нет мест в радиусе {radius} км</span>
            <p className="text-gray-400 text-xs mt-1">Попробуйте увеличить радиус поиска</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto px-4 gap-3 pb-1 snap-x scrollbar-hide pointer-events-auto">
            {filtered.map(p => (
              <ProviderCard key={p.id} p={p} active={selected?.id === p.id} />
            ))}
            <div className="w-2 flex-shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
}

function ProviderCard({ p, active }) {
  return (
    <div
      className={`flex-shrink-0 w-64 bg-white rounded-2xl p-3.5 shadow-md snap-center transition-all cursor-default ${
        active ? 'ring-2 ring-mypet-green shadow-lg scale-[1.02]' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center text-xl">
          {CATEGORIES.find(c => c.slug === p.categories[0])?.emoji ?? '📍'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm truncate">{p.name}</h3>
          {p.desc && <p className="text-[11px] text-gray-400 truncate">{p.desc}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Stars rating={p.rating} />
            <span className="text-[10px] text-gray-400">({p.reviews})</span>
            <span className="text-[11px] font-semibold text-mypet-green bg-green-50 px-1.5 py-0.5 rounded ml-auto">
              {p.distanceKm.toFixed(1)} км
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1 truncate">📍 {p.address}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {p.whatsapp && (
          <a
            href={p.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-green-500 text-white text-xs font-semibold py-1.5 rounded-xl text-center"
          >
            WA
          </a>
        )}
        {p.instagram && (
          <a
            href={p.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-semibold py-1.5 rounded-xl text-center"
          >
            IG
          </a>
        )}
        <a
          href={`tel:+${p.phone}`}
          className="flex-1 bg-mypet-green text-white text-xs font-semibold py-1.5 rounded-xl text-center"
        >
          Позвонить
        </a>
      </div>
    </div>
  );
}
