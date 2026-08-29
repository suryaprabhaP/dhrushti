import React, { useState } from 'react';
import Chatbot from './components/Chatbot';
import AnalyticsDashboard from './analytics/AnalyticsDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { initialDatasetState } from './analytics/services/datasetStore';
import { globalNetworkStore } from './analytics/services/networkAnalyticsService';
import { Shield, MapPin, Radio, BarChart2 } from 'lucide-react';

/**
 * STANDALONE CHATBOT UI MODULE ENTRY POINT
 * Supports seamless switching between Chatbot Console and Advanced Analytics Hub,
 * with shared dataset state across both interfaces.
 */
function App() {
  const [selectedDivision, setSelectedDivision] = useState('Bengaluru Division');
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'analytics'
  const [analyticsInitialTab, setAnalyticsInitialTab] = useState('dashboard');
  const [datasetState, setDatasetState] = useState(initialDatasetState);
  
  // MOCK LOGIN STATE
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return window.location.hash !== '#login';
  });
  const [badgeId, setBadgeId] = useState('OFFICER_BGL_001');
  const [password, setPassword] = useState('ksp2026');

  const handleLoginSubmit = (e) => {
    if (e) e.preventDefault();
    setIsLoggedIn(true);
    if (window.location.hash === '#login') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleQuickBypass = () => {
    setIsLoggedIn(true);
    if (window.location.hash === '#login') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    window.location.hash = '#login';
  };

  // Ingestion callback
  const handleDatasetLoaded = ({ filename, fileSizeBytes, sha256, headers, records }) => {
    // Synchronize both Tabular Store and Network Topology Graph Store
    globalNetworkStore.loadDataset(records, headers, filename);

    setDatasetState(prev => ({
      ...prev,
      isLoaded: true,
      filename,
      fileSizeBytes,
      sha256,
      columns: headers,
      rawRecords: records,
      filteredRecords: records
    }));
  };

  // Filter slicer callbacks
  const handleUpdateFilters = (key, value) => {
    setDatasetState(prev => {
      const newFilters = { ...prev.filters, [key]: value };
      let filtered = [...prev.rawRecords];

      if (newFilters.division && newFilters.division !== 'All') {
        filtered = filtered.filter(r => (r.Division || r.division) === newFilters.division);
      }
      if (newFilters.district && newFilters.district !== 'All') {
        filtered = filtered.filter(r => (r.District || r.district) === newFilters.district);
      }
      if (newFilters.policeStation && newFilters.policeStation !== 'All') {
        filtered = filtered.filter(r => (r.Police_Station || r.police_station || r.Station) === newFilters.policeStation);
      }
      if (newFilters.crimeCategory && newFilters.crimeCategory !== 'All') {
        filtered = filtered.filter(r => (r.Crime_Category || r.crime_category || r.Category) === newFilters.crimeCategory);
      }
      if (newFilters.status && newFilters.status !== 'All') {
        filtered = filtered.filter(r => (r.Status || r.status) === newFilters.status);
      }
      if (newFilters.year && newFilters.year !== 'All') {
        filtered = filtered.filter(r => String(r.Year || r.year || (r.Date ? r.Date.split('-')[0] : '')) === String(newFilters.year));
      }
      if (newFilters.searchKeyword && newFilters.searchKeyword.trim()) {
        const kw = newFilters.searchKeyword.toLowerCase();
        filtered = filtered.filter(r => Object.values(r).some(val => String(val).toLowerCase().includes(kw)));
      }

      return {
        ...prev,
        filters: newFilters,
        filteredRecords: filtered
      };
    });
  };

  const handleResetFilters = () => {
    setDatasetState(prev => ({
      ...prev,
      filteredRecords: prev.rawRecords,
      filters: {
        division: 'All',
        district: 'All',
        policeStation: 'All',
        crimeCategory: 'All',
        status: 'All',
        year: 'All',
        searchKeyword: ''
      }
    }));
  };

  // Central Session Reset Handler (SOLID: App.jsx orchestrates data lifecycle)
  const handleSessionReset = () => {
    setDatasetState(initialDatasetState);
    globalNetworkStore.clearDataset();
  };

  // MOCK LOGIN PORTAL VIEW
  if (!isLoggedIn) {
    return (
      <ErrorBoundary>
        <div style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#090d16',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', system-ui, sans-serif",
          color: '#f8fafc',
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#0f172a',
            borderRadius: '20px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            padding: '32px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 20px rgba(37, 99, 235, 0.5)'
            }}>
              <Shield size={28} color="#ffffff" />
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: '0 0 4px 0', color: '#ffffff' }}>
              Karnataka State Police Portal
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '24px' }}>
              Mock Officer Authentication & Command Console
            </div>

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Select Jurisdiction Division
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '10px 12px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: 700
                  }}
                >
                  <option value="Bengaluru Division">Bengaluru Division</option>
                  <option value="Mysuru Division">Mysuru Division</option>
                  <option value="Belagavi Division">Belagavi Division</option>
                  <option value="Kalaburagi Division">Kalaburagi Division</option>
                  <option value="State HQ Command">State HQ Command</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Officer Badge ID
                </label>
                <input
                  type="text"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '10px 12px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: 700
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Command Passcode
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '10px 12px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: 700
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)'
                }}
              >
                Sign In to Sentinel Console
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
            </div>

            <button
              onClick={handleQuickBypass}
              style={{
                width: '100%',
                padding: '11px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              ⚡ Quick Launch Assistant (Bypass Login)
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (activeView === 'analytics') {
    return (
      <ErrorBoundary>
        <AnalyticsDashboard
          divisionName={selectedDivision}
          onBackToChat={() => setActiveView('chat')}
          datasetState={datasetState}
          initialTab={analyticsInitialTab}
          onDatasetLoaded={handleDatasetLoaded}
          onUpdateFilters={handleUpdateFilters}
          onResetFilters={handleResetFilters}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#090d16',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: '#f8fafc'
      }}>
        {/* CHATBOT UI COMPONENT CONTAINER */}
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden', height: '100vh' }}>
          <Chatbot
            divisionName={selectedDivision}
            onNavigateToAnalytics={() => { setAnalyticsInitialTab('dashboard'); setActiveView('analytics'); }}
            onNavigateToNetwork={() => { setAnalyticsInitialTab('network_graph'); setActiveView('analytics'); }}
            onNavigateToMaps={() => { setAnalyticsInitialTab('hotspot_maps'); setActiveView('analytics'); }}
            onNavigateToVault={() => { setAnalyticsInitialTab('vault'); setActiveView('analytics'); }}
            onDatasetIngested={handleDatasetLoaded}
            onSessionReset={handleSessionReset}
            isDatasetLoaded={datasetState.isLoaded}
            datasetState={datasetState}
          />
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
