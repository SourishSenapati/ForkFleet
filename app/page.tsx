
"use client";

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { Activity, Terminal, X, Rocket, Target } from 'lucide-react';

const CosmosScene = dynamic(() => import('@/components/CosmosScene'), { 
  ssr: false,
  loading: () => (
    <div className="loading-indicator">
      <div className="spinner cosmos-spinner"></div>
      <p className="loading-text">MAPPING COSMOS...</p>
    </div>
  )
});

function StarshipPanel() {
  const selectedIdx = useStore((state) => state.selectedNodeIndex);
  const graph = useStore((state) => state.graph);
  const setSelectedNode = useStore((state) => state.setSelectedNode);
  const barRef = useRef<HTMLDivElement>(null);
  
  const stars = selectedIdx !== null && graph ? graph.nodeData[selectedIdx * 3 + 1] : 0;
  const isRoot = selectedIdx !== null && graph ? graph.nodeData[selectedIdx * 3 + 2] === 1 : false;
  const vitality = selectedIdx !== null && graph ? graph.intelligence[selectedIdx * 3] : 0;
  const innovation = selectedIdx !== null && graph ? graph.intelligence[selectedIdx * 3 + 1] : 0;
  const gravity = selectedIdx !== null && graph ? graph.intelligence[selectedIdx * 3 + 2] : 0;

  useEffect(() => {
    if (barRef.current && selectedIdx !== null) {
        barRef.current.style.width = `${vitality * 100}%`;
        barRef.current.style.backgroundColor = vitality > 0.5 ? '#10b981' : '#ef4444';
    }
  }, [vitality, selectedIdx]);

  if (selectedIdx === null || !graph) return null;

  // Use graph data by default
  const name = graph.nodeData[selectedIdx * 3 + 2] === 1 && useStore.getState().metadata?.name 
    ? useStore.getState().metadata?.name 
    : `SECTOR-${selectedIdx}`;

  return (
    <div className="glass ship-panel space-panel intelligence-suite">
        <div className="panel-header">
            <div className="panel-title">
                {isRoot ? <Target size={18} color="#fbbf24" /> : <Rocket size={18} color={innovation > 0.6 ? '#4ade80' : '#3b82f6'} />}
                <span>{isRoot ? 'PULSAR CORE' : (innovation > 0.6 ? 'INNOVATION POD' : 'INTERCEPTOR')}</span>
            </div>
            <X size={18} className="close-btn" onClick={() => setSelectedNode(null)} />
        </div>

        <div className="repo-header-mini">
            <span className="repo-name-mini">{name}</span>
        </div>
        
        <div className="intelligence-grid">
            <div className="stat-item">
                <span className="stat-label">LUX</span>
                <span className="stat-value flagship-text">{stars.toLocaleString()}</span>
            </div>
            <div className="stat-item">
                <span className="stat-label">GRAVITY</span>
                <span className="stat-value">{(gravity * 10).toFixed(1)} G</span>
            </div>
        </div>
        
        <div className="stat-item panel-stat">
            <div className="label-row">
                <span className="stat-label">ECOSYSTEM HEALTH</span>
                <span className="stat-value">{(vitality * 100).toFixed(0)}%</span>
            </div>
            <div className="vitality-bar-bg">
                <div ref={barRef} className="vitality-bar-fill"></div>
            </div>
        </div>

        <div className="panel-actions">
            <button className="glass-btn primary small">INITIATE DOCKING</button>
            <button className="glass-btn secondary small">VIEW GENEALOGY</button>
        </div>
    </div>
  );
}

function SearchIntelligenceHUD() {
    const metadata = useStore((state) => state.metadata);
    if (!metadata) return null;

    return (
        <div className="glass search-intelligence-hud fadeIn">
            <div className="metadata-header">
                <img src={metadata.avatar} alt="" className="meta-avatar" />
                <div className="meta-info">
                    <span className="meta-title">{metadata.name}</span>
                    <span className="meta-lang">{metadata.language}</span>
                </div>
            </div>
            <p className="meta-desc">{metadata.description}</p>
            <div className="meta-stats">
                <div className="meta-stat">
                    <span className="stat-label">STARS</span>
                    <span className="stat-value">{metadata.stars.toLocaleString()}</span>
                </div>
                <div className="meta-stat">
                    <span className="stat-label">FORKS</span>
                    <span className="stat-value">{metadata.forks.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
  const [url, setUrl] = useState('');
  const timelineYear = useStore((state) => state.timelineYear);
  const setTimelineYear = useStore((state) => state.setTimelineYear);
  const { fetchGraph, loadStaticUniverse, loading, error, graph, cameraMode, setCameraMode, currentRepo } = useStore();

  useEffect(() => {
    // Initial Load: Code Cosmos Snapshot (Cost Neutral)
    loadStaticUniverse();
  }, [loadStaticUniverse]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    const [owner, repo] = url.split('/');
    if (owner && repo) {
      fetchGraph(owner, repo);
    }
  };

  const hotspots = [
    { name: 'RUST GALAXY', repo: 'rust-lang/rust' },
    { name: 'AI CLUSTER', repo: 'tensorflow/tensorflow' },
    { name: 'WEB NEBULA', repo: 'facebook/react' },
    { name: 'SYSTEMS SECTOR', repo: 'ziglang/zig' }
  ];

  const { isLaunched, setLaunched } = useStore();

  return (
    <main className="scene-container cosmos-bg">
      <CosmosScene />
      
      {!isLaunched ? (
        <div className="launch-overlay glass">
            <div className="briefing-panel">
                <h2 className="briefing-title">MISSION BRIEFING: CODE COSMOS</h2>
                <p className="briefing-text">You are about to enter the software empire. Navigate through the dependency star-systems, discover innovation pulsars, and map the evolution of human logic.</p>
                <div className="briefing-controls">
                    <div className="control-set"><span>WASD</span> NAVIGATION</div>
                    <div className="control-set"><span>MOUSE</span> LOOK</div>
                    <div className="control-set"><span>CLICK</span> ANALYZE</div>
                </div>
                <button className="launch-btn pulsed" onClick={() => setLaunched(true)}>LAUNCH MISSION</button>
            </div>
            <p className="launch-subtext">OPTIMIZED FOR GLOBAL SCALING | 60 FPS GPU PHYSICS</p>
        </div>
      ) : (
        <div className="ui-overlay fadeIn">
            <div className="top-row">
            <form className="glass search-bar space-search gps-input" onSubmit={handleSearch}>
                <Terminal size={18} opacity={0.5} />
                <input 
                id="gps-coordinates"
                type="text" 
                placeholder="ENTER GALACTIC COORDINATES" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                title="Software GPS Coordinates"
                aria-label="GALACTIC COORDINATES"
                />
                <button type="submit" disabled={loading} className="warp-btn" title="Initiate Warp">
                {loading ? <Activity className="rotate" size={18} /> : 'WARP'}
                </button>
            </form>

            {graph && (
                <div className="glass stats-card spatial-radar">
                <div className="stats-grid">
                    <div className="stat-item">
                    <span className="stat-label">SECTOR SIZE</span>
                    <span className="stat-value">{graph.nodeCount}</span>
                    </div>
                    <div className="stat-item">
                    <span className="stat-label">GRAV NODES</span>
                    <span className="stat-value">{graph.edgeCount}</span>
                    </div>
                    <div className="stat-item">
                    <span className="stat-label">NAV MODE</span>
                    <span className="stat-value camera-mode" 
                            onClick={() => setCameraMode(cameraMode === 'explorer' ? 'focus' : 'explorer')}>
                        {cameraMode === 'focus' ? 'TARGET' : 'ORBIT'}
                    </span>
                    </div>
                </div>
                
                <div className="intelligence-legend">
                    <div className="legend-grid">
                    <div className="legend-item"><div className="dot flagship"></div> PULSAR</div>
                    <div className="legend-item"><div className="dot active"></div> STAR</div>
                    <div className="legend-item"><div className="dot abandoned"></div> VOID</div>
                    <div className="legend-item"><div className="dot innovation"></div> RADAR</div>
                    </div>
                </div>
                </div>
            )}
            </div>

            {/* Discovery Mode Hotspots */}
            <div className="hotspots-container">
                <span className="hotspot-label">HOTSPOTS:</span>
                {hotspots.map((spot) => (
                    <button 
                    key={spot.repo} 
                    className={`glass-btn hotspot-btn ${currentRepo?.repo === spot.repo.split('/')[1] ? 'hotspot-active' : ''}`} 
                    onClick={() => fetchGraph(spot.repo.split('/')[0], spot.repo.split('/')[1])}
                    >
                    {spot.name}
                    </button>
                ))}
                {!currentRepo && (
                    <div className="static-indicator glass">
                        <div className="status-dot pulsed"></div>
                        <span className="data-mode-tag">HIGH TRAFFIC PROTECTION: ON</span>
                    </div>
                )}
            </div>

            {error && (
                <div className="loading-indicator error-pos">
                    <div className="glass error-box">
                        <X size={20} className="error-icon" />
                        <p>{error}</p>
                    </div>
                </div>
            )}

            <SearchIntelligenceHUD />
            <StarshipPanel />

            {/* Software Evolution Timeline */}
            <div className="timeline-container glass">
                <div className="timeline-header">
                    <span>RECOGNITION ERA: {timelineYear}</span>
                    <span className="innovation-tag">EVOLUTION SIMULATOR</span>
                </div>
                <input 
                    id="timeline-slider"
                    type="range" 
                    min="2010" 
                    max="2025" 
                    step="1" 
                    value={timelineYear}
                    onChange={(e) => setTimelineYear(parseInt(e.target.value))}
                    className="evolution-slider"
                    title="Evolutionary Epoch"
                    aria-label="Timeline Evolution Slider"
                />
            </div>
        </div>
      )}

      <div className="hero-text gpu-accelerated">
        <h1>CODE COSMOS</h1>
        <p className="hero-sub">THE SOFTWARE EMPIRE MAP</p>
      </div>
    </main>
  );
}
