
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
  metadata: {
    name: string;
    description: string;
    avatar: string;
    stars: number;
    forks: number;
    language: string;
    type: 'repo' | 'profile';
  } | null;
  
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
  metadata: null,

  setLaunched: (val) => set({ isLaunched: val }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setSelectedNode: (index) => set({ selectedNodeIndex: index, cameraMode: index !== null ? 'focus' : 'explorer' }),
  setTimelineYear: (year) => set({ timelineYear: year }),

  loadStaticUniverse: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${window.location.pathname.startsWith('/ForkFleet') ? '/ForkFleet' : ''}/data/universe.json`);
      if (!response.ok) throw new Error('Static Universe not found');
      const data: UniverseData = await response.json();
      set({ graph: parseTypedGraph(data), loading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load universe snapshot';
      set({ error: msg, loading: false });
    }
  },

  fetchGraph: async (owner, repo) => {
    set({ loading: true, error: null, currentRepo: repo ? { owner, repo } : null, selectedNodeIndex: null, metadata: null });
    
    try {
      if (repo) {
        // COORDINATES: REPOSITORY LENS
        const repoResp = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (repoResp.ok) {
          const repoData = await repoResp.json();
          set({ metadata: {
            name: repoData.full_name,
            description: repoData.description || 'NO DESCRIPTION AVAILABLE',
            avatar: repoData.owner.avatar_url,
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            language: repoData.language || 'UNKNOWN',
            type: 'repo'
          }});
        }
      } else {
        // COORDINATES: PROFILE LENS
        const userResp = await fetch(`https://api.github.com/users/${owner}`);
        if (userResp.ok) {
            const userData = await userResp.json();
            set({ metadata: {
                name: userData.login,
                description: userData.bio || 'PILOT BIO UNKNOWN',
                avatar: userData.avatar_url,
                stars: userData.public_repos,
                forks: userData.followers,
                language: userData.location || 'DEEP SPACE',
                type: 'profile'
            }});
        }
      }

      // 2. Fetch graph data (Failover to static)
      const response = await fetch(`${window.location.pathname.startsWith('/ForkFleet') ? '/ForkFleet' : ''}/data/universe.json`);
      if (response.ok) {
        const data: UniverseData = await response.json();
        set({ graph: parseTypedGraph(data), loading: false });
      } else {
          throw new Error('Sector data unavailable');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Navigation limited: Out of sector';
      set({ error: msg, loading: false });
    }
  },
}));
