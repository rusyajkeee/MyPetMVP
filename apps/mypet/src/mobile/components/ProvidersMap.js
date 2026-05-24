import { useEffect, useRef } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import MapView, { Callout, Marker, UrlTile } from 'react-native-maps';
import { typography } from '../theme';

export default function ProvidersMap({
  providers, userCoords, radiusKm, catColor,
  loading, onProviderPress, badge, mapLoadingText, openProfileText,
}) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...userCoords,
        latitudeDelta: radiusKm * 0.018,
        longitudeDelta: radiusKm * 0.018,
      }, 600);
    }
  }, [userCoords, radiusKm]);

  return (
    <View style={{ height: 480, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{ ...userCoords, latitudeDelta: radiusKm * 0.018, longitudeDelta: radiusKm * 0.018 }}
        showsUserLocation
        showsMyLocationButton
      >
        <UrlTile urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} tileSize={256} />
        {providers.map((provider) =>
          provider.lat && provider.lng ? (
            <Marker key={provider.id} coordinate={{ latitude: provider.lat, longitude: provider.lng }} pinColor={catColor}>
              <Callout onPress={() => onProviderPress(provider.id)} style={{ width: 220, padding: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', fontFamily: typography.body }}>{provider.businessName}</Text>
                <Text style={{ fontSize: 12, color: '#666', fontFamily: typography.body }}>{provider.address}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 4 }}>
                  {provider.avgRating ? <Text style={{ fontSize: 12, color: '#b45309' }}>★ {provider.avgRating.toFixed(1)}</Text> : null}
                  <Text style={{ fontSize: 12, color: '#16a34a' }}>{provider.distanceKm} km</Text>
                </View>
                {provider.whatsapp ? (
                  <Pressable onPress={() => Linking.openURL(provider.whatsapp)} style={{ backgroundColor: '#22c55e', borderRadius: 8, paddingVertical: 5, alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>WhatsApp</Text>
                  </Pressable>
                ) : null}
                <Text style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>{openProfileText}</Text>
              </Callout>
            </Marker>
          ) : null
        )}
      </MapView>

      {loading ? (
        <View style={{ position: 'absolute', top: 12, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
          <Text style={{ color: '#fff', fontSize: 12 }}>{mapLoadingText}</Text>
        </View>
      ) : null}

      <View style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, elevation: 3 }}>
        <Text style={{ fontSize: 12, fontWeight: '700' }}>{badge}</Text>
      </View>
    </View>
  );
}
