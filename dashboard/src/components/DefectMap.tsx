import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { DefectSummary } from '../types';

interface DefectMapProps {
  defects: DefectSummary[];
  selectedDefectId: string | null;
  onSelectDefect: (id: string) => void;
}

export const DefectMap: React.FC<DefectMapProps> = ({
  defects,
  selectedDefectId,
  onSelectDefect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center (Bangalore coordinate fallback)
    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: true,
    });

    // Dark-styled OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when defects list or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (defects.length === 0) return;

    const bounds = L.latLngBounds([]);

    defects.forEach((defect) => {
      const lat = defect.latitude;
      const lon = defect.longitude;
      if (isNaN(lat) || isNaN(lon)) return;

      bounds.extend([lat, lon]);

      // Priority color mapping
      let color = '#3b82f6';
      let tier = 'LOW';
      if (defect.priority_score >= 75) {
        color = '#ef4444';
        tier = 'CRITICAL';
      } else if (defect.priority_score >= 50) {
        color = '#f97316';
        tier = 'HIGH';
      } else if (defect.priority_score >= 25) {
        color = '#eab308';
        tier = 'MEDIUM';
      }

      const isSelected = selectedDefectId === defect.id;
      const radius = isSelected ? 12 : 9;

      // Custom circle marker
      const marker = L.circleMarker([lat, lon], {
        radius,
        fillColor: color,
        color: isSelected ? '#ffffff' : color,
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.85,
      });

      // Custom Popup HTML
      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 180px; padding: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="color: #38bdf8; font-size: 0.85rem; font-family: monospace;">${defect.id}</strong>
            <span style="background: ${color}25; color: ${color}; border: 1px solid ${color}60; font-size: 0.65rem; padding: 1px 6px; border-radius: 4px; font-weight: 700;">
              ${tier} ${defect.priority_score}
            </span>
          </div>
          <div style="font-size: 0.8rem; color: #cbd5e1; margin-bottom: 4px;">
            <strong>Type:</strong> ${defect.defect_type}
          </div>
          <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px;">
            <strong>Reports:</strong> ${defect.observation_count} • <strong>Status:</strong> ${defect.status}
          </div>
          <button
            id="btn-inspect-${defect.id}"
            style="
              width: 100%;
              padding: 6px 10px;
              background: #0284c7;
              color: #ffffff;
              border: none;
              border-radius: 6px;
              font-size: 0.75rem;
              font-weight: 600;
              cursor: pointer;
            "
          >
            Inspect Defect Details →
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-inspect-${defect.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectDefect(defect.id);
            marker.closePopup();
          };
        }
      });

      marker.on('click', () => {
        onSelectDefect(defect.id);
      });

      layer.addLayer(marker);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [defects, selectedDefectId, onSelectDefect]);

  return (
    <div
      className="glass-panel"
      style={{
        height: '420px',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Map Header Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-subtle)',
          padding: '8px 16px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
          GEOSPATIAL TRIAGE MAP
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
            Critical (≥75)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fb923c' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f97316' }}></span>
            High (50-74)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#facc15' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#eab308' }}></span>
            Medium (25-49)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
            Low (&lt;25)
          </span>
        </div>
      </div>

      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
    </div>
  );
};
