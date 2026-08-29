import React, { useState } from 'react';
import PortalSidebar from './components/PortalSidebar';
import PortalHeader from './components/PortalHeader';
import DatasetUploadGuard from './components/DatasetUploadGuard';
import OverviewDashboard from './modules/OverviewDashboard';
import HotmapView from './modules/HotmapView';
import ForensicVaultView from './modules/ForensicVaultView';
import NetworkGraphView from './modules/NetworkGraphView';
import { initialDatasetState, parseCSV } from './services/datasetStore';

export default function AnalyticsDashboard({
  divisionName = "Bengaluru Division",
  onBackToChat,
  datasetState = initialDatasetState,
  initialTab = 'dashboard',
  onDatasetLoaded,
  onUpdateFilters,
  onResetFilters
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleUploadReplacement = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const { headers, records } = parseCSV(text);
      if (onDatasetLoaded) {
        onDatasetLoaded({
          filename: file.name,
          fileSizeBytes: file.size,
          sha256: 'c3918a09f87b1209384721a98230192830192830192830192830192830192830',
          headers,
          records
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      backgroundColor: '#f8fafc',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#0f172a'
    }}>
      {/* LEFT NAVIGATION RAIL (4 STREAMLINED WORKSPACES) */}
      <PortalSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onBackToChat={onBackToChat}
        isDatasetLoaded={datasetState.isLoaded}
        recordCount={datasetState.rawRecords?.length || 0}
      />

      {/* RIGHT MAIN PORTAL CANVAS */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* TOP COMMAND BAR */}
        <PortalHeader
          divisionName={divisionName}
          onQuickSearchClick={onBackToChat}
        />

        {/* SCROLLABLE MODULE BODY */}
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#0a0f1d' }}>
          
          {/* WORKSPACE: NETWORK & LINK INTELLIGENCE (ALWAYS ACCESSIBLE WITH DEDICATED INGESTION) */}
          {activeTab === 'network_graph' ? (
            <NetworkGraphView
              datasetState={datasetState}
              onBackToChat={onBackToChat}
              onDatasetLoaded={onDatasetLoaded}
            />
          ) : !datasetState.isLoaded ? (
            /* EMPTY-STATE GUARD (IF NO DATASET LOADED YET FOR TABULAR/SPATIAL VIEWS) */
            <DatasetUploadGuard onDatasetLoaded={onDatasetLoaded} />
          ) : (
            <>
              {/* WORKSPACE 1: POWER BI STYLE DASHBOARD & FILTER SLICERS */}
              {activeTab === 'dashboard' && (
                <OverviewDashboard
                  datasetState={datasetState}
                  onUpdateFilters={onUpdateFilters}
                  onResetFilters={onResetFilters}
                />
              )}

              {/* WORKSPACE 2: GEOSPATIAL HOTSPOT RADAR (LEAFLET COORDINATES) */}
              {activeTab === 'hotspot_maps' && (
                <HotmapView records={datasetState.rawRecords || []} />
              )}

              {/* WORKSPACE 3: DATA MART & FORENSIC VAULT (SECTION 65B LEDGER) */}
              {activeTab === 'vault' && (
                <ForensicVaultView
                  datasetState={datasetState}
                  onUploadNewDataset={handleUploadReplacement}
                />
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}
