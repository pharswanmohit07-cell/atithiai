import React, { useCallback, useState } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { LocateFixed, MapPin } from "lucide-react";
import { PLACES, getCrowd, getCrowdLevel } from "../data/places.js";
import { useTheme } from "../context/ThemeContext.jsx";

const HOTEL_CENTER = [30.3165, 78.0322];
const CATEGORY_COLORS = {
  nature: "#16835D",
  spiritual: "#8B5CF6",
  market: "#D97706",
  heritage: "#2563EB",
  viewpoint: "#DB5679",
  village: "#0D9488",
};

function visitFlags() {
  const day = new Date().getDay();
  return { isWeekend: day === 0 || day === 6, isHoliday: false };
}

function CrowdBadge({ place }) {
  const level = getCrowdLevel(getCrowd(place, visitFlags()));
  const colors = {
    Low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
    Medium: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
    High: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
  };
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${colors[level]}`}>{level} crowd · estimated</span>;
}

function LocateMeControl({ onLocated }) {
  const map = useMap();
  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = [position.coords.latitude, position.coords.longitude];
        map.flyTo(point, 13, { duration: 0.8 });
        onLocated(point);
      },
      () => {
        // Location is optional; deny/timeout/unavailable should fail silently.
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 },
    );
  }, [map, onLocated]);

  return (
    <div className="leaflet-top leaflet-right atithi-locate-control">
      <div className="leaflet-control">
        <button type="button" aria-label="Locate me" title="Locate me" onClick={locate} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-text shadow-md transition hover:bg-surface-2">
          <LocateFixed size={17}/>
        </button>
      </div>
    </div>
  );
}

function CurrentLocationMarker({ position }) {
  if (!position) return null;
  return (
    <CircleMarker center={position} radius={7} pathOptions={{ color: "#FFFFFF", weight: 2, fillColor: "#2563EB", fillOpacity: 1 }}>
      <Popup><strong>Your approximate location</strong><br/><span>Shared by your browser for this session.</span></Popup>
    </CircleMarker>
  );
}

function FitPlaces({ places, mini }) {
  const map = useMap();
  React.useEffect(() => {
    if (!mini || places.length < 2) return;
    const bounds = L.latLngBounds(places.map((place) => [place.lat, place.lon]));
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.18), { maxZoom: 11, animate: false });
  }, [map, mini, places]);
  return null;
}

export default function PlacesMap({
  places = PLACES,
  onAddToItinerary,
  selectedPlaceIds = [],
  mini = false,
  height,
}) {
  const { isDark } = useTheme();
  const [userPosition, setUserPosition] = useState(null);
  const handleLocated = useCallback((point) => setUserPosition(point), []);
  const mapHeight = height || (mini ? 190 : 350);

  return (
    <div className={`atithi-places-map relative overflow-hidden rounded-2xl border border-border ${isDark ? "atithi-map-dark" : ""} ${mini ? "atithi-map-mini" : ""}`} style={{ height: mapHeight }}>
      <MapContainer
        center={HOTEL_CENTER}
        zoom={10}
        scrollWheelZoom={!mini}
        doubleClickZoom={!mini}
        zoomControl={!mini}
        className={`h-full w-full ${isDark ? "atithi-map-dark" : ""}`}
        style={{ height: "100%", width: "100%", background: "var(--bg)" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <CircleMarker center={HOTEL_CENTER} radius={8} pathOptions={{ color: "#FFFFFF", weight: 2, fillColor: "#263E35", fillOpacity: 1 }}>
          <Popup><strong>Atithi hotel base</strong><br/><span>Dehradun · map start point</span></Popup>
        </CircleMarker>
        {places.filter((place) => Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon))).map((place) => {
          const color = CATEGORY_COLORS[place.category] || "#475569";
          const added = selectedPlaceIds.includes(place.id);
          return (
            <CircleMarker key={place.id} center={[place.lat, place.lon]} radius={mini ? 6 : 8} pathOptions={{ color: "#FFFFFF", weight: 2, fillColor: color, fillOpacity: 0.92 }}>
              <Popup>
                <div className="atithi-map-popup min-w-[190px] max-w-[235px]">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{place.category}</p>
                  <h3 className="mt-1 text-sm font-bold">{place.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed">{place.shortDesc}</p>
                  <div className="mt-2"><CrowdBadge place={place}/></div>
                  <p className="mt-2 text-xs">~{place.travelMinutes} min from Dehradun · estimated</p>
                  <p className="mt-1 text-xs">₹{Number(place.localSpendINR || 0).toLocaleString("en-IN")} local spend · estimated</p>
                  {onAddToItinerary && (
                    <button
                      type="button"
                      disabled={added}
                      onClick={() => onAddToItinerary(place)}
                      className="mt-3 w-full rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {added ? "Already in itinerary" : "Add to itinerary"}
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        <CurrentLocationMarker position={userPosition}/>
        <LocateMeControl onLocated={handleLocated}/>
        <FitPlaces places={places} mini={mini}/>
      </MapContainer>
      {!mini && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex flex-wrap gap-2">
          {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
            <span key={category} className="flex items-center gap-1.5 rounded-full border border-border bg-surface/95 px-2 py-1 text-[9px] font-semibold capitalize text-text shadow-sm">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }}/>
              {category}
            </span>
          ))}
        </div>
      )}
      {mini && <span className="pointer-events-none absolute bottom-2 left-2 z-[500] rounded-full border border-border bg-surface/90 px-2 py-1 text-[9px] text-muted shadow-sm"><MapPin size={10} className="mr-1 inline"/>Curated destinations</span>}
    </div>
  );
}
