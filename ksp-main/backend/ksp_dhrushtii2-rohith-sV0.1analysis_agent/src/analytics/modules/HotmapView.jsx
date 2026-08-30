import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Layers, Filter, ShieldCheck, Sparkles, Navigation } from 'lucide-react';

export default function HotmapView({ records = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState('All');

  const filteredPoints = records.filter(r => {
    if (selectedDivisionFilter !== 'All' && r.Division !== selectedDivisionFilter) return false;
    return r.Latitude && r.Longitude;
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map centered at Bengaluru / Karnataka
      const map = L.map(mapContainerRef.current, {
        center: [13.15, 76.50],
        zoom: 7,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | KSP Sentinel AI'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Color map for crime heads
    const colorMap = {
      'Cyber Fraud': '#1e3a8a',
      'Theft & Burglary': '#d97706',
      'Heinous Crimes': '#dc2626',
      'Special & Local Laws': '#0d9488',
      'Women & Child Safety': '#7c3aed'
    };

    // Plot up to 400 points to ensure smooth rendering
    filteredPoints.slice(0, 400).forEach(r => {
      const color = colorMap[r.Crime_Category] || '#0284c7';
      const marker = L.circleMarker([r.Latitude, r.Longitude], {
        radius: 6,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.75
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: system-ui; font-size: 11px; line-height: 1.4;">
          <b style="color: #1e3a8a;">${r.FIR_Number || 'FIR Record'}</b><br/>
          <b>Station:</b> ${r.Police_Station || 'HQ'}<br/>
          <b>Category:</b> ${r.Crime_Category || 'General'}<br/>
          <b>Status:</b> ${r.Status || 'Active'}<br/>
          <b>Loss:</b> ₹${(r.Loss_Amount_INR || 0).toLocaleString()}
        </div>
      `);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [filteredPoints, selectedDivisionFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      
      {/* TOP RADAR CONTROLS */}
      <div style={{
        padding: '12px 24px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={18} color="#0284c7" />
          <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
            Geospatial Crime Radar ({filteredPoints.length.toLocaleString()} plotted coordinates)
          </h3>
        </div>

        {/* DIVISION FILTER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Filter Division:</span>
          <select
            value={selectedDivisionFilter}
            onChange={(e) => setSelectedDivisionFilter(e.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', outline: 'none' }}
          >
            <option value="All">All Karnataka Divisions</option>
            <option value="Bengaluru Division">Bengaluru Division</option>
            <option value="Mysuru Division">Mysuru Division</option>
            <option value="Belagavi Division">Belagavi Division</option>
            <option value="Kalaburagi Division">Kalaburagi Division</option>
          </select>
        </div>
      </div>

      {/* LEAFLET MAP CONTAINER */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* MAP LEGEND OVERLAY */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '10px 14px',
          zIndex: 1000,
          boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
          fontSize: '0.7rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <b style={{ color: '#0f172a', marginBottom: '2px' }}>Incident Heat Legend</b>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1e3a8a' }} /> Cyber Fraud</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706' }} /> Theft & Burglary</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }} /> Heinous Crimes</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0d9488' }} /> Special & Local Laws</div>
        </div>
      </div>
    </div>
  );
}
