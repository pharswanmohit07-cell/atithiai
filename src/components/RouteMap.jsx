import React, { useMemo } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { useTheme } from "../context/ThemeContext.jsx";
import { CORRIDOR_WAYPOINTS, DEMO_HOMESTAYS } from "../data/corridor.js";
import "./RouteMap.css";

const WAYPOINT_INDEX = new Map(CORRIDOR_WAYPOINTS.map((waypoint, index) => [waypoint.id, index]));

function waypointIcon(number, isCurrent) {
  return L.divIcon({
    className: "route-guard-div-icon",
    html: `<span class="route-guard-waypoint-marker${isCurrent ? " is-current" : ""}">${number}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

function villageIcon() {
  return L.divIcon({
    className: "route-guard-div-icon",
    html: '<span class="route-guard-village-marker" aria-hidden="true">V</span>',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}

export default function RouteMap({
  selectedWaypointId,
  setSelectedWaypointId,
  disruptions = [],
  detourVillage = null,
  height = 360,
}) {
  const { isDark } = useTheme();
  const selectedWaypoint = CORRIDOR_WAYPOINTS.find((item) => item.id === selectedWaypointId) || CORRIDOR_WAYPOINTS[3];
  const routePositions = useMemo(() => CORRIDOR_WAYPOINTS.map((waypoint) => [waypoint.lat, waypoint.lon]), []);
  const routeBounds = useMemo(() => L.latLngBounds(routePositions.map(([lat, lon]) => L.latLng(lat, lon)),), [routePositions]);
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = isDark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const blockedSegments = disruptions.map((disruption) => {
    const from = CORRIDOR_WAYPOINTS.find((waypoint) => waypoint.id === disruption.segment?.[0]);
    const to = CORRIDOR_WAYPOINTS.find((waypoint) => waypoint.id === disruption.segment?.[1]);
    return from && to ? { disruption, positions: [[from.lat, from.lon], [to.lat, to.lon]] } : null;
  }).filter(Boolean);

  const detourPositions = detourVillage
    ? [[selectedWaypoint.lat, selectedWaypoint.lon], [detourVillage.lat, detourVillage.lon]]
    : null;

  return (
    <section className="route-guard-map-shell overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Route Guard · OpenStreetMap</p>
          <h2 className="mt-1 font-serif text-xl text-text">Char Dham-style corridor</h2>
          <p className="mt-1 text-[10px] text-muted">Waypoints and elevations are approximate planning data.</p>
        </div>
        <span className="rounded-full bg-surface-2 px-2.5 py-1.5 text-[9px] font-semibold text-muted">Traveler: {selectedWaypoint.name}</span>
      </div>
      <MapContainer
        bounds={routeBounds}
        boundsOptions={{ padding: [24, 24] }}
        scrollWheelZoom={false}
        className="route-guard-map-canvas"
        style={{ height: `${height}px`, width: "100%" }}
      >
        <TileLayer url={tileUrl} attribution={attribution} maxZoom={19} />
        <Polyline positions={routePositions} pathOptions={{ color: isDark ? "#8ba5d8" : "#405b83", weight: 4, opacity: 0.78 }} />
        {blockedSegments.map(({ disruption, positions }) => (
          <Polyline
            key={disruption.id}
            positions={positions}
            pathOptions={{ color: "#dc2626", weight: 6, opacity: 0.98, dashArray: "10 8", lineCap: "round" }}
          >
            <Popup>
              <div className="route-guard-map-popup">
                {disruption.source === "demo" && <strong className="route-guard-demo-tag">DEMO EVENT</strong>}
                <strong className="block capitalize">{disruption.type} disruption</strong>
                <span className="block">Severity: {disruption.severity}</span>
                <span className="block text-xs">Detected: {new Date(disruption.detectedAt).toLocaleString()}</span>
              </div>
            </Popup>
          </Polyline>
        ))}
        {detourPositions && (
          <Polyline positions={detourPositions} pathOptions={{ color: "#16a34a", weight: 5, opacity: 0.95, dashArray: "5 7", lineCap: "round" }}>
            <Popup><strong>Estimated demo detour</strong><br />To {detourVillage.name}<br />Straight-line connection only; not a road route.</Popup>
          </Polyline>
        )}
        {DEMO_HOMESTAYS.map((village) => (
          <Marker key={village.id} position={[village.lat, village.lon]} icon={villageIcon()}>
            <Popup>
              <div className="route-guard-map-popup">
                <strong>{village.name}</strong>
                <span className="route-guard-demo-tag mt-1">Demo listing</span>
                <span className="mt-1 block">Approx. {village.elevationM} m elevation</span>
                <span className="block">₹{village.localSpendINR} estimated local spend</span>
                <span className="mt-1 block text-xs">Illustrative area only. Not a real property or bookable stay.</span>
              </div>
            </Popup>
          </Marker>
        ))}
        {CORRIDOR_WAYPOINTS.map((waypoint, index) => {
          const isCurrent = waypoint.id === selectedWaypoint.id;
          return (
            <React.Fragment key={waypoint.id}>
              {isCurrent && <CircleMarker center={[waypoint.lat, waypoint.lon]} radius={21} pathOptions={{ color: "#f59e0b", weight: 3, opacity: 0.95, fillOpacity: 0.09 }} />}
              <Marker
                position={[waypoint.lat, waypoint.lon]}
                icon={waypointIcon(index + 1, isCurrent)}
                eventHandlers={{ click: () => setSelectedWaypointId?.(waypoint.id) }}
              >
                <Popup>
                  <div className="route-guard-map-popup">
                    <strong>{index + 1}. {waypoint.name}</strong>
                    {isCurrent && <span className="mt-1 block font-bold text-amber-700">Traveler's current waypoint</span>}
                    <span className="mt-1 block">Elevation: approx. {waypoint.elevationM} m</span>
                    <span className="block text-xs">{waypoint.desc}</span>
                    <span className="mt-1 block text-xs">{waypoint.lat.toFixed(4)}, {waypoint.lon.toFixed(4)} · approximate coordinates</span>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border px-4 py-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5"><i className="route-guard-legend-line base" /> Planned corridor</span>
        {blockedSegments.map(({ disruption }) => <span key={disruption.id} className="flex items-center gap-1.5"><i className="route-guard-legend-line blocked" />{disruption.source === "demo" ? "DEMO EVENT · " : ""}{disruption.type} segment</span>)}
        {detourVillage && <span className="flex items-center gap-1.5"><i className="route-guard-legend-line detour" /> Estimated detour to {detourVillage.name}</span>}
      </div>
    </section>
  );
}
