'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchEnterpriseMap, type EmployeeCompaniesResponse } from '@/lib/employee-portal';
import { getImageUrl } from '@/lib/utils';

type LeafletMap = any;
type LeafletLayerGroup = any;

const LEAFLET_SCRIPT_ID = 'leaflet-js-cdn';
const LEAFLET_STYLE_ID = 'leaflet-css-cdn';
const CUCUTA_CENTER: [number, number] = [7.8891, -72.4967];
const CUCUTA_DEFAULT_ZOOM = 12;

const parseCoordinate = (value?: string | number | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getShortReverseAddress = (data: any) => {
  const address = data?.address;
  if (!address) {
    return typeof data?.display_name === 'string' ? data.display_name.trim() : '';
  }

  const road = [address.road, address.house_number].filter(Boolean).join(' ');
  const area = address.neighbourhood || address.suburb || address.city_district || address.quarter || '';
  const city = address.city || address.town || address.village || address.county || '';

  const shortAddress = [road, area, city].filter(Boolean).join(', ');
  return shortAddress || (typeof data?.display_name === 'string' ? data.display_name.trim() : '');
};

const escapeHtmlAttribute = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const ensureLeafletLoaded = async () => {
  if (typeof window === 'undefined') return null;
  if ((window as any).L) return (window as any).L;

  if (!document.getElementById(LEAFLET_STYLE_ID)) {
    const link = document.createElement('link');
    link.id = LEAFLET_STYLE_ID;
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(LEAFLET_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).L) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Leaflet.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = LEAFLET_SCRIPT_ID;
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Leaflet.'));
    document.body.appendChild(script);
  });

  return (window as any).L || null;
};

export function EnterpriseMapExplorer() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LeafletLayerGroup | null>(null);
  const reverseAddressCacheRef = useRef<Map<string, string>>(new Map());

  const [items, setItems] = useState<EmployeeCompaniesResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchEnterpriseMap();
        setItems(response?.enterprises || []);
      } catch (err: any) {
        setError(err?.message || 'No se pudo cargar el mapa de empresas.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const enterprisesWithCoordinates = useMemo(
    () =>
      items.filter((item) => {
        const lat = parseCoordinate(item.latitude);
        const lng = parseCoordinate(item.longitude);
        return lat !== null && lng !== null;
      }),
    [items],
  );

  const fetchReverseAddress = async (lat: number, lng: number) => {
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const cached = reverseAddressCacheRef.current.get(key);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: 'json',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: {
          'Accept-Language': 'es',
        },
      });

      if (!response.ok) return null;
      const data = await response.json();
      const displayName = getShortReverseAddress(data);
      if (!displayName) return null;

      reverseAddressCacheRef.current.set(key, displayName);
      return displayName;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const mountMap = async () => {
      if (!mapContainerRef.current) return;

      const L = await ensureLeafletLoaded();
      if (!L || cancelled || !mapContainerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          zoomControl: true,
        }).setView(CUCUTA_CENTER, CUCUTA_DEFAULT_ZOOM);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapRef.current);

        markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
      }

      const map = mapRef.current;
      const markersLayer = markersLayerRef.current;
      if (!map || !markersLayer) return;

      markersLayer.clearLayers();

      const buildPopupHtml = (item: EmployeeCompaniesResponse, reverseAddress = 'Cargando...') => `
          <div style="min-width:220px;max-width:280px">
            <p style="margin:0;font-weight:700;font-size:14px;">${escapeHtmlAttribute(item.name || 'Empresa')}</p>
            <p style="margin:4px 0 0 0;font-size:12px;color:#475569;">${escapeHtmlAttribute(item.email || 'Sin correo')}</p>
            <p style="margin:6px 0 0 0;font-size:12px;"><strong>Tel:</strong> ${escapeHtmlAttribute(item.phone || 'No registrado')}</p>
            <p style="margin:4px 0 0 0;font-size:12px;"><strong>Sector:</strong> ${escapeHtmlAttribute(item.niche || 'No registrado')}</p>
            <p style="margin:8px 0 0 0;font-size:12px;color:#0f172a;"><strong>Dirección:</strong> ${escapeHtmlAttribute(reverseAddress)}</p>
          </div>
        `;

      enterprisesWithCoordinates.forEach((item) => {
        const lat = parseCoordinate(item.latitude);
        const lng = parseCoordinate(item.longitude);
        if (lat === null || lng === null) return;

        const avatarSrc = getImageUrl(item.avatar || '');
        const safeName = (item.name || 'E').trim();
        const initials = safeName.charAt(0).toUpperCase();
        const iconHtml = avatarSrc
          ? `<div style="width:44px;height:44px;border-radius:9999px;border:2px solid #fff;box-shadow:0 8px 20px rgba(0,0,0,.25);overflow:hidden;background:#fff"><img src="${escapeHtmlAttribute(avatarSrc)}" alt="${escapeHtmlAttribute(safeName)}" style="width:100%;height:100%;object-fit:cover" /></div>`
          : `<div style="width:44px;height:44px;border-radius:9999px;border:2px solid #fff;box-shadow:0 8px 20px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;background:#0f172a;color:#fff;font-weight:700">${escapeHtmlAttribute(initials)}</div>`;

        const icon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const marker = L.marker([lat, lng], { icon });
        marker.bindTooltip(item.name || 'Empresa');
        marker.bindPopup(buildPopupHtml(item));
        marker.on('popupopen', async () => {
          const reverseAddress = await fetchReverseAddress(lat, lng);
          marker.setPopupContent(buildPopupHtml(item, reverseAddress || 'No disponible'));
        });
        marker.on('click', () => marker.openPopup());
        marker.addTo(markersLayer);
      });

      map.setView(CUCUTA_CENTER, CUCUTA_DEFAULT_ZOOM);
    };

    mountMap();
    return () => {
      cancelled = true;
    };
  }, [enterprisesWithCoordinates]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="h-screen w-full">
      {loading ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">Cargando mapa...</div>
      ) : error ? (
        <div className="flex items-center justify-center h-full text-red-600">{error}</div>
      ) : (
        <div ref={mapContainerRef} className="h-full w-full bg-muted" />
      )}
    </div>
  );
}
