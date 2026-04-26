import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import type { CommunitySignal } from "@/lib/store";
import "mapbox-gl/dist/mapbox-gl.css";

export function InteractiveRegionMap({
  signals,
  token,
  className = "h-72",
  compact = false,
}: {
  signals: CommunitySignal[];
  token: string;
  className?: string;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;
      const mapbox = await import("mapbox-gl");
      if (cancelled || !containerRef.current) return;

      mapbox.default.accessToken = token;
      mapRef.current = new mapbox.default.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-110.95, 32.18],
        zoom: compact ? 8.55 : 9,
        attributionControl: !compact,
      });
      if (!compact) {
        mapRef.current.addControl(new mapbox.default.NavigationControl({ visualizePitch: true }), "top-right");
      }
      mapRef.current.on("load", () => {
        addRegionLayers(mapRef.current!);
        setMapReady(true);
      });
      mapRef.current.on("zoomend", () => {
        const map = mapRef.current;
        if (!map) return;
        const shouldPitch = map.getZoom() >= 11.25;
        const pitched = map.getPitch() > 20;
        if (shouldPitch && !pitched) map.easeTo({ pitch: 58, bearing: -18, duration: 450 });
        if (!shouldPitch && pitched) map.easeTo({ pitch: 0, bearing: 0, duration: 450 });
      });
    }

    initMap();
    return () => {
      cancelled = true;
      setMapReady(false);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, compact]);

  useEffect(() => {
    async function renderMarkers() {
      if (!mapRef.current || !mapReady) return;
      const mapbox = await import("mapbox-gl");
      updateRegionData(mapRef.current, signals);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = signals.map((signal) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = `${compact ? "h-7 w-7 text-[9px]" : "h-9 w-9 text-[10px]"} grid place-items-center rounded-full border-2 border-white font-extrabold text-white shadow-lg`;
        el.style.backgroundColor = `#${markerColor(signal)}`;
        el.textContent = String(Math.min(signal.rank, 99));
        el.setAttribute("aria-label", `${signal.title}, rank ${signal.rank}`);

        const popupNode = document.createElement("div");
        popupNode.className = "text-[12px] leading-relaxed";
        const title = document.createElement("strong");
        title.textContent = signal.title;
        const details = document.createElement("p");
        details.textContent = `${signal.illness.replace("-", " ")} - ${signal.severity} - rank ${signal.rank}`;
        const expiry = document.createElement("p");
        expiry.textContent = `Expires ${new Date(signal.expiresAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric" })}`;
        popupNode.append(title, details, expiry);

        return new mapbox.default.Marker({ element: el })
          .setLngLat([signal.longitude, signal.latitude])
          .setPopup(new mapbox.default.Popup({ offset: 18 }).setDOMContent(popupNode))
          .addTo(mapRef.current!);
      });
    }

    renderMarkers();
  }, [signals, mapReady, compact]);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-navy ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute left-3 top-3 rounded-xl bg-white/90 px-3 py-2 shadow-soft">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Interactive Mapbox</p>
        <p className="text-[12px] font-extrabold text-navy">Zoom in for 3D regions</p>
      </div>
    </div>
  );
}

function addRegionLayers(map: mapboxgl.Map) {
  if (map.getSource("case-regions")) return;
  map.addSource("case-regions", { type: "geojson", data: emptyFeatureCollection() });
  map.addLayer({
    id: "case-region-fill",
    type: "fill",
    source: "case-regions",
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0.24, 11, 0.34, 13, 0.12],
    },
  });
  map.addLayer({
    id: "case-region-outline",
    type: "line",
    source: "case-regions",
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 12, 3],
      "line-opacity": 0.82,
    },
  });
  map.addLayer({
    id: "case-region-extrusion",
    type: "fill-extrusion",
    source: "case-regions",
    minzoom: 11.25,
    paint: {
      "fill-extrusion-color": ["get", "color"],
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.68,
    },
  });
}

function updateRegionData(map: mapboxgl.Map, signals: CommunitySignal[]) {
  const source = map.getSource("case-regions") as mapboxgl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData({
    type: "FeatureCollection",
    features: signals
      .filter((signal) => signal.type !== "clinic" && signal.type !== "healthy-report")
      .map((signal) => {
        const radiusMiles = radiusMilesFor(signal);
        return {
          type: "Feature",
          properties: {
            id: signal.id,
            title: signal.title,
            illness: signal.illness.replace("-", " "),
            severity: signal.severity,
            rank: signal.rank,
            color: `#${markerColor(signal)}`,
            radiusMiles,
            height: Math.max(260, signal.rank * 34),
          },
          geometry: {
            type: "Polygon",
            coordinates: [circleCoordinates(signal.longitude, signal.latitude, radiusMiles)],
          },
        };
      }),
  });
}

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] };
}

function radiusMilesFor(signal: CommunitySignal) {
  const base = signal.severity === "high" ? 5 : signal.severity === "moderate" ? 3 : 1.5;
  const countBoost = Math.min(signal.count ?? 1, 10) * 0.18;
  const typeBoost = signal.type === "animal" || signal.type === "mosquito" ? 1.2 : 0;
  return Number((base + countBoost + typeBoost).toFixed(1));
}

function circleCoordinates(longitude: number, latitude: number, radiusMiles: number) {
  const earthRadiusMiles = 3958.8;
  const points = 72;
  const coordinates: number[][] = [];
  const latRad = toRadians(latitude);
  const lngRad = toRadians(longitude);
  const angularDistance = radiusMiles / earthRadiusMiles;
  for (let i = 0; i <= points; i += 1) {
    const bearing = toRadians((i / points) * 360);
    const pointLat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const pointLng = lngRad + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(pointLat),
    );
    coordinates.push([toDegrees(pointLng), toDegrees(pointLat)]);
  }
  return coordinates;
}

function markerColor(signal: CommunitySignal) {
  if (signal.type === "clinic") return "2f91a3";
  if (signal.type === "healthy-report") return "31a46c";
  if (signal.type === "mosquito") return "2aa79b";
  if (signal.type === "heat") return "d99a00";
  if (signal.severity === "high") return "d84a3a";
  if (signal.severity === "moderate") return "d99a00";
  return "31a46c";
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}

function toDegrees(value: number) {
  return value * 180 / Math.PI;
}
