import React, { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { LocateFixed, Plus, Check } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";

const FALLBACK_CENTER = [0, 0];
const MAP_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CATEGORY_RADIUS = {
  viewpoint: 8, market: 6, cafe: 5, culture: 7, nature: 8, craft: 6, wellness: 6
};

function MapFocus({ destination, focusPlaceId }) {
  const map = useMap();
  useEffect(() => {
    const place = destination.places.find((item) => item.id === focusPlaceId);
    if (place) map.flyTo([place.lat, place.lon], 15, { duration: 0.55 });
  }, [destination.id, destination.places, focusPlaceId, map]);
  return null;
}

function LocateUser({ requestNumber, onLocated }) {
  const map = useMap();
  useEffect(() => {
    if (!requestNumber || typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = [position.coords.latitude, position.coords.longitude];
        if (!coordinates.every(Number.isFinite)) return;
        onLocated(coordinates);
        map.flyTo(coordinates, 15, { duration: 0.6 });
      },
      () => { /* Location is optional; failures are intentionally silent. */ },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );
  }, [requestNumber, map, onLocated]);
  return null;
}

export default function DestinationMap({
  destination,
  height = 360,
  focusPlaceId = null,
  onAddPlace,
  plannedIds = []
}) {
  const { isDark } = useTheme();
  const [locateRequest, setLocateRequest] = useState(0);
  const [userPosition, setUserPosition] = useState(null);
  const center = [Number(destination?.lat), Number(destination?.lon)];
  const validCenter = center.every(Number.isFinite) ? center : FALLBACK_CENTER;
  const planned = new Set(plannedIds);

  if (!Array.isArray(destination?.places) || !destination.places.length) {
    return <div className="map-empty" style={{ minHeight: height }}>No mapped places are available in this destination pack.</div>;
  }

  return <section className="overflow-hidden rounded-2xl border border-border bg-surface">
    <div className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div>
        <h2 className="font-serif text-xl">Explore the map</h2>
        <p className="text-[10px] text-muted">OpenStreetMap tiles · no API key required · internet connection needed</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setLocateRequest((value) => value + 1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold"><LocateFixed size={14}/>Locate me</button>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-[10px] font-bold">{destination.city}, {destination.country}</span>
      </div>
    </div>
    <MapContainer center={validCenter} zoom={12} scrollWheelZoom={false} style={{ height, width: "100%" }} key={destination.id}>
      <MapFocus destination={destination} focusPlaceId={focusPlaceId}/>
      <LocateUser requestNumber={locateRequest} onLocated={setUserPosition}/>
      <TileLayer attribution={TILE_ATTRIBUTION} url={MAP_TILES} className={isDark ? "atithi-dark-tiles" : ""}/>
      {destination.places.map((place) => {
        const alreadyPlanned = planned.has(place.id) || planned.has("place-" + place.id);
        const radius = (CATEGORY_RADIUS[place.category] || 6) + (place.isHiddenGem ? 1 : 0);
        return <CircleMarker
          key={place.id}
          center={[place.lat, place.lon]}
          radius={place.id === focusPlaceId ? radius + 4 : radius}
          pathOptions={{
            color: destination.themeColors.accent,
            fillColor: destination.themeColors.accent,
            fillOpacity: place.id === focusPlaceId ? 1 : 0.82,
            weight: place.id === focusPlaceId ? 3 : 1.5
          }}
        >
          <Popup>
            <div className="max-w-56">
              <p className="font-bold">{place.name}</p>
              <p className="mt-1 text-xs">{place.localStory}</p>
              <p className="mt-2 text-[10px]">{place.category} · {place.crowdLevel} crowd (estimated)</p>
              {place.isHiddenGem && <p className="mt-1 text-[10px] font-bold">Hidden-place pick · demo</p>}
              <button
                type="button"
                disabled={alreadyPlanned}
                onClick={() => onAddPlace?.(place)}
                className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: destination.themeColors.accent }}
              >
                {alreadyPlanned ? <Check size={12}/> : <Plus size={12}/>}
                {alreadyPlanned ? "In plan" : "Add to plan"}
              </button>
            </div>
          </Popup>
        </CircleMarker>;
      })}
      {userPosition && <CircleMarker
        center={userPosition}
        radius={9}
        pathOptions={{ color: "#ffffff", weight: 3, fillColor: destination.themeColors.accent, fillOpacity: 1 }}
      >
        <Popup>You are here · location shown only for this map session.</Popup>
      </CircleMarker>}
    </MapContainer>
    <div className="flex flex-wrap gap-2 p-3">
      {Array.from(new Set(destination.places.map((place) => place.category))).map((category) => <span key={category} className="rounded-full border border-border px-2 py-1 text-[10px] text-muted">{category}</span>)}
      <span className="ml-auto text-[10px] text-muted">Demo content · coordinates approximate</span>
    </div>
  </section>;
}
