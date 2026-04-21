/// <reference types="@types/google.maps" />
'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { StoreWithDistance } from '@/types';

interface StoreMapProps {
  stores: StoreWithDistance[];
  center: { lat: number; lng: number };
  searchCenter: { lat: number; lng: number } | null;
  onStoreSelect: (store: StoreWithDistance) => void;
  onMapClick: (location: { lat: number; lng: number }) => void;
}

export default function StoreMap({ stores, center, searchCenter, onStoreSelect, onMapClick }: StoreMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const searchPinRef = useRef<google.maps.Marker | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
      version: 'weekly',
    });

    loader.importLibrary('maps').then(({ Map }) => {
      if (cancelled || !mapRef.current) return;
      const map = new Map(mapRef.current, {
        center,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });
      mapInstanceRef.current = map;

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          onMapClickRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
      });

      setMapReady(true);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !searchCenter) return;

    mapInstanceRef.current.panTo(searchCenter);

    if (searchPinRef.current) searchPinRef.current.setMap(null);
    searchPinRef.current = new google.maps.Marker({
      position: searchCenter,
      map: mapInstanceRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: '#EF4444',
        fillOpacity: 0.9,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      zIndex: 100,
    });
  }, [mapReady, searchCenter]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    stores.forEach(store => {
      const marker = new google.maps.Marker({
        position: { lat: store.latitude, lng: store.longitude },
        map: mapInstanceRef.current,
        title: store.name_ja,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: store.entry_count > 0 ? 10 : 8,
          fillColor: store.entry_count > 0 ? '#3B82F6' : '#9CA3AF',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => onStoreSelect(store));
      markersRef.current.push(marker);
    });
  }, [mapReady, stores, onStoreSelect]);

  return <div ref={mapRef} className="w-full h-full" />;
}
