
import { create } from 'zustand';
import { TypedGraph } from './graph';

interface ForkFleetState {
  graph: TypedGraph | null;
  loading: boolean;
  error: string | null;
  currentRepo: { owner: string; repo: string } | null;
  cameraMode: 'explorer' | 'focus';
  selectedNodeIndex: number | null;
  timelineYear: number;
  isLaunched: boolean;
  
  fetchGraph: (owner: string, repo: string) => Promise<void>;
  loadStaticUniverse: () => Promise<void>;
  setCameraMode: (mode: 'explorer' | 'focus') => void;
  setSelectedNode: (index: number | null) => void;
  setTimelineYear: (year: number) => void;
  setLaunched: (val: boolean) => void;
}

interface UniverseData {
  nodeCount: number;
  edgeCount: number;
  positions: number[];
  nodeData: number[];
  intelligence: number[];
  edgeIndices: number[];
}

function parseTypedGraph(data: UniverseData): TypedGraph {
  return {
    nodeCount: data.nodeCount,
    edgeCount: data.edgeCount,
    positions: new Float32Array(data.positions),
    nodeData: new Float32Array(data.nodeData),
    intelligence: new Float32Array(data.intelligence),
    edgeIndices: new Uint16Array(data.edgeIndices),
  };
}

export const useStore = create<ForkFleetState>((set) => ({
  graph: null,
  loading: false,
  error: null,
  currentRepo: null,
  cameraMode: 'explorer',
  selectedNodeIndex: null,
  timelineYear: 2025,
  isLaunched: false,

  setLaunched: (val) => set({ isLaunched: val }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setSelectedNode: (index) => set({ selectedNodeIndex: index, cameraMode: index !== null ? 'focus' : 'explorer' }),
  setTimelineYear: (year) => set({ timelineYear: year }),

  loadStaticUniverse: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/data/universe.json');
      if (!response.ok) throw new Error('Static Universe not found');
      const data: UniverseData = await response.json();
      set({ graph: parseTypedGraph(data), loading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load universe snapshot';
      set({ error: msg, loading: false });
    }
  },

  fetchGraph: async (owner, repo) => {
    set({ loading: true, error: null, currentRepo: { owner, repo }, selectedNodeIndex: null });
    try {
      const response = await fetch(`/api/forks?owner=${owner}&repo=${repo}`);
      if (!response.ok) {
        if (response.status === 429) {
          // BUDGET EXCEEDED: Failover smoothly to Static Universe
          const staticResp = await fetch('/data/universe.json');
          if (staticResp.ok) {
            const staticData: UniverseData = await staticResp.json();
            set({ 
                graph: parseTypedGraph(staticData), 
                loading: false, 
                error: 'HIGH TRAFFIC MODE: NAVIGATING CACHED SECTOR' 
            });
            return;
          }
        }
        const errorData: { error?: string } = await response.json();
        throw new Error(errorData.error || 'Failed to fetch graph data');
      }
      const data: UniverseData = await response.json();
      set({ graph: parseTypedGraph(data), loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error: message, loading: false });
    }
  },
}));
