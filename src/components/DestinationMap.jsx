import React, { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";

const FALLBACK_CENTER = [0, 0];

function MapFocus({ destination, focusPlaceId }) {
  const map = useMap();
  useEffect(() => {
    const place = destination.places.find((item) => item.id === focusPlaceId);
    if (place) map.flyTo([place.lat, place.lon], 15, { duration: 0.55 });
  }, [destination.id, destination.places, focusPlaceId, map]);
  return null;
}

export default function DestinationMap({ destination, height = 360, focusPlaceId = null }) {
  const center = [Number(destination?.lat), Number(destination?.lon)];
  const validCenter = center.every(Number.isFinite) ? center : FALLBACK_CENTER;
  if (!Array.isArray(destination?.places) || !destination.places.length) {
    return <div className="map-empty" style={{ minHeight: height }}>No mapped places are available in this destination pack.</div>;
  }
  return <section className="overflow-hidden rounded-2xl border border-border bg-surface">
    <div className="flex flex-wrap items-center justify-between gap-3 p-3"><div><h2 className="font-serif text-xl">Explore the map</h2><p className="text-[10px] text-muted">Approximate coordinates · map tiles require connectivity</p></div><span className="rounded-full bg-surface-2 px-3 py-1 text-[10px] font-bold">{destination.city}, {destination.country}</span></div>
    <MapContainer center={validCenter} zoom={12} scrollWheelZoom={false} style={{ height, width: "100%" }} key={destination.id}>
      <MapFocus destination={destination} focusPlaceId={focusPlaceId}/>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      {destination.places.map((place) => <CircleMarker key={place.id} center={[place.lat, place.lon]} radius={place.id === focusPlaceId ? 12 : place.isHiddenGem ? 8 : 6} pathOptions={{ color: destination.themeColors.accent, fillColor: destination.themeColors.accent, fillOpacity: place.id === focusPlaceId ? 1 : 0.8, weight: place.id === focusPlaceId ? 3 : 1.5 }}>
        <Popup><div className="max-w-52"><p className="font-bold">{place.name}</p><p className="mt-1 text-xs">{place.localStory}</p><p className="mt-1 text-[10px]">{place.isHiddenGem ? "Hidden-place pick · demo" : "Place idea · demo"}</p></div></Popup>
      </CircleMarker>)}
    </MapContainer>
    <div className="flex flex-wrap gap-2 p-3">{Array.from(new Set(destination.places.map((place) => place.category))).map((category) => <span key={category} className="rounded-full border border-border px-2 py-1 text-[10px] text-muted">{category}</span>)}</div>
  </section>;
}
