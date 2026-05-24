import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

// Fix Leaflet's broken default icon URLs in bundler environments
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function InjectCSS() {
  useEffect(() => {
    if (document.getElementById('leaflet-css')) return;
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }, []);
  return null;
}

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center[0], center[1], zoom]);
  return null;
}

export default function ProvidersMap({
  providers, userCoords, radiusKm, catColor,
  loading, onProviderPress, badge, mapLoadingText, openProfileText,
}) {
  const center = [userCoords.latitude, userCoords.longitude];
  const zoom = Math.max(11, Math.round(14 - Math.log2(radiusKm)));

  return (
    <div style={{ height: 480, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
      <InjectCSS />
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <MapController center={center} zoom={zoom} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {providers.map((provider) =>
          provider.lat && provider.lng ? (
            <Marker key={provider.id} position={[provider.lat, provider.lng]}>
              <Popup minWidth={200}>
                <strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>{provider.businessName}</strong>
                {provider.address ? <p style={{ fontSize: 12, margin: '0 0 4px' }}>{provider.address}</p> : null}
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  {provider.avgRating ? <span style={{ fontSize: 12, color: '#b45309' }}>★ {provider.avgRating.toFixed(1)}</span> : null}
                  <span style={{ fontSize: 12, color: '#16a34a' }}>{provider.distanceKm} km</span>
                </div>
                {provider.whatsapp ? (
                  <a
                    href={provider.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'block', background: '#22c55e', color: 'white', textAlign: 'center', padding: '5px 8px', borderRadius: 8, textDecoration: 'none', marginBottom: 6, fontSize: 13, fontWeight: 700 }}
                  >
                    WhatsApp
                  </a>
                ) : null}
                <button
                  onClick={() => onProviderPress(provider.id)}
                  style={{ width: '100%', background: '#1d4ed8', color: 'white', border: 'none', padding: '6px 8px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  {openProfileText}
                </button>
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>

      {loading ? (
        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 14px', borderRadius: 20, zIndex: 1000, fontSize: 12, whiteSpace: 'nowrap' }}>
          {mapLoadingText}
        </div>
      ) : null}

      <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'white', padding: '5px 12px', borderRadius: 20, zIndex: 1000, fontSize: 12, fontWeight: 700, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
        {badge}
      </div>
    </div>
  );
}
