import React from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

const CATEGORY_COLORS = {
  heritage: "#b45309",
  museum: "#7c3aed",
  nature: "#15803d",
  viewpoint: "#0369a1",
  food: "#be123c",
  market: "#a16207",
  architecture: "#6d28d9",
  "public-square": "#0f766e",
};

function MarkerPopup({ title, detail, badge }) {
  return <div className="min-w-36 text-sm">
    <strong>{title}</strong>
    {badge && <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">{badge}</p>}
    {detail && <p className="mt-1 text-xs">{detail}</p>}
  </div>;
}

export default function DestinationMap({ destination, height = 320 }) {
  if (!destination || !Number.isFinite(destination.lat) || !Number.isFinite(destination.lon)) {
    return <div className="map-empty" style={{ height }} role="status">Map data is not available for this destination.</div>;
  }

  return (
    <section className="destination-map overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-border p-3">
        <div>
          <h2 className="font-semibold text-text">{destination.city} map</h2>
          <p className="text-xs text-muted">Approximate pins · Demo listings are not bookings.</p>
        </div>
        <span className="rounded-full border border-border px-2 py-1 text-[10px] text-muted">OpenStreetMap</span>
      </div>
      <MapContainer center={[destination.lat, destination.lon]} zoom={12} scrollWheelZoom={false} style={{ height: `${height}px`, width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <CircleMarker center={[destination.lat, destination.lon]} radius={11} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#0f766e", fillOpacity: 1 }}>
          <Popup><MarkerPopup title={destination.hotel.name} detail={`Three-star demo hotel · ${destination.hotel.rooms} rooms`} badge="Hotel · demo" /></Popup>
        </CircleMarker>
        {destination.places.map((place) => {
          const color = CATEGORY_COLORS[place.category] || "#475569";
          return <CircleMarker key={place.id} center={[place.lat, place.lon]} radius={7} pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: color, fillOpacity: 0.95 }}>
            <Popup><MarkerPopup title={place.name} detail={place.category} badge={place.lowCrowd ? "Estimated quieter option" : "Destination place"} /></Popup>
          </CircleMarker>;
        })}
      </MapContainer>
      <div className="flex flex-wrap gap-2 p-3">
        {Object.entries(CATEGORY_COLORS).filter(([category]) => destination.places.some((place) => place.category === category)).map(([category, color]) => (
          <span key={category} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-[10px] capitalize text-muted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{category}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-[10px] text-muted"><span className="h-2 w-2 rounded-full bg-brand" />Hotel · demo</span>
      </div>
    </section>
  );
}
