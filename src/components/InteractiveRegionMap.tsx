import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import type { CommunitySignal } from "@/lib/store";
import { formatRelativeTime } from "@/lib/utils";
import "mapbox-gl/dist/mapbox-gl.css";

export function InteractiveRegionMap({
  signals,
  token,
  className = "h-72",
  compact = false,
  showBadge = true,
}: {
  signals: CommunitySignal[];
  token: string;
  className?: string;
  compact?: boolean;
  showBadge?: boolean;
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
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-110.95, 32.18],
        zoom: compact ? 8.55 : 9,
        attributionControl: !compact,
      });
      if (!compact) {
        mapRef.current.addControl(new mapbox.default.NavigationControl({ visualizePitch: true }), "top-right");
      }
      mapRef.current.on("load", () => {
        addRegionLayers(mapRef.current!);
        mapRef.current!.resize();
        window.setTimeout(() => mapRef.current?.resize(), 120);
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
        const reported = document.createElement("p");
        reported.textContent = `Reported ${formatRelativeTime(signal.createdAt)} (${formatCaseDate(signal.createdAt)})`;
        expiry.textContent = `Expires ${new Date(signal.expiresAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric" })}`;
        popupNode.append(title, details, reported, expiry);

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
      {showBadge ? (
        <div className="absolute left-3 top-3 rounded-xl bg-white/90 px-3 py-2 shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Interactive Mapbox</p>
          <p className="text-[12px] font-extrabold text-navy">Zoom in for 3D regions</p>
        </div>
      ) : null}
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
    features: clusterSignals(signals)
      .map((cluster) => ({
        type: "Feature",
        properties: {
          id: cluster.ids.join(","),
          title: cluster.count === 1 ? cluster.title : `${cluster.count} related reports`,
          illness: cluster.illness.replace("-", " "),
          severity: cluster.severity,
          rank: cluster.rank,
          color: `#${cluster.color}`,
          radiusMiles: cluster.radiusMiles,
          height: Math.max(180, cluster.rank * 28),
        },
        geometry: {
          type: "Polygon",
          coordinates: [circleCoordinates(cluster.longitude, cluster.latitude, cluster.radiusMiles)],
        },
      })),
  });
}

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] };
}

type SignalCluster = {
  ids: string[];
  title: string;
  type: CommunitySignal["type"];
  illness: CommunitySignal["illness"];
  severity: CommunitySignal["severity"];
  longitude: number;
  latitude: number;
  rank: number;
  count: number;
  radiusMiles: number;
  color: string;
};

function clusterSignals(signals: CommunitySignal[]): SignalCluster[] {
  const clusters: SignalCluster[] = [];
  const regionSignals = signals.filter((signal) => signal.type !== "clinic" && signal.type !== "healthy-report");

  for (const signal of regionSignals) {
    const closest = clusters
      .filter((cluster) => cluster.type === signal.type || cluster.illness === signal.illness)
      .map((cluster) => ({ cluster, distance: distanceMiles(cluster.longitude, cluster.latitude, signal.longitude, signal.latitude) }))
      .filter(({ cluster, distance }) => distance <= mergeDistanceMiles(cluster, signal))
      .sort((a, b) => a.distance - b.distance)[0]?.cluster;

    if (!closest) {
      clusters.push({
        ids: [signal.id],
        title: signal.title,
        type: signal.type,
        illness: signal.illness,
        severity: signal.severity,
        longitude: signal.longitude,
        latitude: signal.latitude,
        rank: signal.rank,
        count: signal.count ?? 1,
        radiusMiles: 0,
        color: markerColor(signal),
      });
      continue;
    }

    const reportCount = signal.count ?? 1;
    const totalCount = closest.count + reportCount;
    closest.longitude = ((closest.longitude * closest.count) + (signal.longitude * reportCount)) / totalCount;
    closest.latitude = ((closest.latitude * closest.count) + (signal.latitude * reportCount)) / totalCount;
    closest.count = totalCount;
    closest.ids.push(signal.id);
    closest.rank = Math.max(closest.rank, signal.rank) + Math.min(Math.sqrt(totalCount) * 4, 18);
    closest.severity = severityFromRank(closest.rank);
    closest.color = colorFromRank(closest.rank);
  }

  return clusters.map((cluster) => ({
    ...cluster,
    radiusMiles: radiusMilesForCluster(cluster),
    color: colorFromRank(cluster.rank),
  }));
}

function mergeDistanceMiles(cluster: SignalCluster, signal: CommunitySignal) {
  const base =
    signal.type === "animal" ? 0.9 :
    signal.type === "environmental" || signal.type === "mosquito" || signal.type === "heat" ? 1.15 :
    0.72;
  const densityBoost = Math.min(Math.sqrt(cluster.count) * 0.16, 0.58);
  return base + densityBoost;
}

function radiusMilesForCluster(cluster: SignalCluster) {
  const singleBase = cluster.type === "animal" || cluster.type === "environmental" || cluster.type === "mosquito" ? 0.5 : 0.38;
  const densityBoost = Math.sqrt(Math.max(cluster.count - 1, 0)) * 0.28;
  const riskBoost = cluster.rank >= 78 ? 0.45 : cluster.rank >= 55 ? 0.22 : 0;
  const maxRadius = cluster.type === "environmental" || cluster.type === "mosquito" || cluster.type === "heat" ? 3.6 : 2.8;
  return Number(Math.min(maxRadius, singleBase + densityBoost + riskBoost).toFixed(2));
}

function severityFromRank(rank: number): CommunitySignal["severity"] {
  if (rank >= 78) return "high";
  if (rank >= 35) return "moderate";
  return "low";
}

function distanceMiles(lngA: number, latA: number, lngB: number, latB: number) {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(latB - latA);
  const dLng = toRadians(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
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
  return colorFromRank(signal.rank);
}

function colorFromRank(rank: number) {
  if (rank >= 82) return "c7352f";
  if (rank >= 68) return "d84a3a";
  if (rank >= 50) return "e57f22";
  return "e0b72f";
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}

function toDegrees(value: number) {
  return value * 180 / Math.PI;
}

function formatCaseDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
