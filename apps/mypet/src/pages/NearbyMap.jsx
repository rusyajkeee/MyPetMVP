import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/client';
import MapProviderCard from '../components/MapProviderCard';
import { useAuth } from '../context/AuthContext';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom custom marker icon for providers
const providerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const CATEGORIES = [
  { slug: 'VETERINARY', label: 'Vet', emoji: '🩺' },
  { slug: 'GROOMING', label: 'Grooming', emoji: '✂️' },
  { slug: 'BOARDING', label: 'Boarding', emoji: '🏠' },
  { slug: 'TRAINING', label: 'Training', emoji: '🦮'},
];

const RADIUS_OPTIONS = [1, 3, 5, 10];

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function NearbyMap() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Geolocation states
  const [userLoc, setUserLoc] = useState([43.238, 76.945]); // default to Almaty
  const [locationLoaded, setLocationLoaded] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // Filter states
  const [category, setCategory] = useState('VETERINARY');
  const [radius, setRadius] = useState(10);
  const [topRated, setTopRated] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState([]);
  
  const navigate = useNavigate();

  // Get User Location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLoc([pos.coords.latitude, pos.coords.longitude]);
          setLocationLoaded(true);
        },
        (err) => {
          console.warn("Geolocation denied or failed.", err);
          setLocationError("Could not access your location. Using default city center.");
          setLocationLoaded(true); // Continue anyway with default
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
      setLocationLoaded(true);
    }
  }, []);

  // Fetch Providers
  useEffect(() => {
    if (!locationLoaded) return;
    
    setLoading(true);
    api.get('/providers/nearby', { 
      params: { 
        lat: userLoc[0], 
        lng: userLoc[1], 
        radius, 
        category 
        ,
        topRated
      } 
    })
      .then(({ data }) => setProviders(data || []))
      .catch((err) => console.error("Failed to fetch nearby:", err))
      .finally(() => setLoading(false));
  }, [locationLoaded, userLoc, radius, category, topRated]);

  useEffect(() => {
    if (!user) return;
    api.get('/users/favorites/ids')
      .then(({ data }) => setFavoriteIds(Array.isArray(data) ? data : []))
      .catch(() => setFavoriteIds([]));
  }, [user]);

  async function toggleFavorite(providerId, nextState) {
    if (!user) return;
    if (nextState) await api.post('/users/favorites', { providerId });
    else await api.delete(`/users/favorites/${providerId}`);
    setFavoriteIds((current) => nextState ? Array.from(new Set([...current, providerId])) : current.filter((id) => id !== providerId));
  }

  if (!locationLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4 pb-20">
        <div className="w-10 h-10 border-4 border-mypet-green border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">Finding your location...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full relative bg-gray-100 flex flex-col">
      {/* Filters Overlay */}
      <div className="absolute top-0 left-0 right-0 z-[400] bg-white/90 backdrop-blur-md shadow-sm p-4 pt-6 max-w-lg mx-auto rounded-b-3xl">
        <h1 className="text-lg font-bold text-gray-900 mb-3">Nearby Services</h1>
        
        {locationError && (
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg mb-3">
            {locationError}
          </p>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {CATEGORIES.map(c => (
            <button
              key={c.slug}
              onClick={() => setCategory(c.slug)}
              className={`flex-shrink-0 snap-center px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                category === c.slug 
                  ? 'bg-mypet-green text-white border-mypet-green shadow-md' 
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center mt-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Radius:</span>
          {RADIUS_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-3 py-1 text-xs rounded-full font-medium ${
                radius === r 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs font-medium text-gray-600">
          <input
            type="checkbox"
            checked={topRated}
            onChange={(event) => setTopRated(event.target.checked)}
            className="rounded border-gray-300 text-mypet-green focus:ring-mypet-green"
          />
          Top rated first
        </label>
      </div>

      {/* Map Container */}
      <div className="flex-1 w-full h-full relative z-0">
        <MapContainer 
          center={userLoc} 
          zoom={13} 
          scrollWheelZoom={true} 
          className="w-full h-full"
          zoomControl={false}
        >
          <ChangeView center={userLoc} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User Location Marker */}
          <Marker position={userLoc}>
            <Popup>
              <div className="text-center">
                <span className="font-bold block text-mypet-green mb-1">Your Location</span>
                <span className="text-xs text-gray-500 block">Radius set to {radius} km</span>
              </div>
            </Popup>
          </Marker>

          <MarkerClusterGroup chunkedLoading>
            {providers.map(p => (
              <Marker key={p.id} position={[p.latitude, p.longitude]} icon={providerIcon}>
                <Popup className="mypet-popup">
                  <div className="min-w-[150px]">
                    <h3 className="font-bold text-gray-900 leading-tight mb-1">{p.businessName || `${p.user.firstName} ${p.user.lastName}`}</h3>
                    <p className="text-xs text-gray-600 mb-2 truncate">{p.services[0]?.title || 'Service'}</p>

                    <div className="flex justify-between items-center mb-3 text-xs">
                      <span className="font-medium text-mypet-green bg-green-50 px-1.5 py-0.5 rounded">
                        {p.distanceKm} km
                      </span>
                      <span className="text-gray-500 font-medium">
                        ★ {p.rating ? Number(p.rating).toFixed(1) : 'New'}
                      </span>
                    </div>
                    {p.isVerified && <p className="mb-2 text-[11px] font-semibold text-emerald-600">Verified provider</p>}

                    <div className="flex gap-2">
                      {user && (
                        <button
                          onClick={() => toggleFavorite(p.id, !favoriteIds.includes(p.id))}
                          className={`px-2.5 rounded-lg text-xs font-semibold ${favoriteIds.includes(p.id) ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-600'}`}
                        >
                          ♥
                        </button>
                      )}
                      <button 
                        onClick={() => navigate(`/provider/${p.id}`)}
                        className="flex-1 bg-mypet-green text-white font-medium text-xs py-1.5 rounded-lg active:scale-95 transition-transform"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {/* Horizontal List of Providers */}
      <div className="absolute bottom-6 w-full z-[400] max-w-lg mx-auto left-0 right-0">
        {loading ? (
          <div className="w-full text-center text-sm font-medium bg-white/90 backdrop-blur mx-auto max-w-[200px] py-2 rounded-full shadow-lg text-mypet-green">
            Searching nearby...
          </div>
        ) : providers.length === 0 ? (
          <div className="w-full mx-4 mr-8 text-center text-sm bg-white/90 backdrop-blur p-4 rounded-2xl shadow-lg border border-gray-100">
            <span className="block text-2xl mb-1">🔍</span>
            <span className="font-semibold text-gray-800">No {category.toLowerCase()} providers nearby</span>
            <p className="text-gray-500 text-xs mt-1">Try expanding your radius</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto px-4 pb-4 snap-x scrollbar-hide">
             {providers.map(p => (
               <MapProviderCard key={p.id} p={p} />
             ))}
             <div className="w-4 flex-shrink-0" />
          </div>
        )}
      </div>

    </div>
  );
}
