
import { GitHubRepo } from './github';

export interface GraphNode {
  id: string;
  label: string;
  stars: number;
  size: number;
  isRoot: boolean;
  vitality: number; // 0-1 health score
  innovation: number; // 0-1 emergent idea score
  gravity: number; // 0-1 influence/dependency score
  languageId: number; 
  pushedYear: number;
}

export interface GraphEdge {
  source: number;
  target: number;
}

export interface ProcessedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java', 'C++', 'C#', 'Ruby', 'PHP'
];

function getLanguageId(lang: string | null): number {
  if (!lang) return 0;
  const idx = LANGUAGES.indexOf(lang);
  return idx === -1 ? LANGUAGES.length : idx + 1;
}

function calculateIntelligence(repo: GitHubRepo): { vitality: number, innovation: number, gravity: number } {
  const pushedDate = new Date(repo.pushed_at).getTime();
  const now = Date.now();
  const monthsSincePush = (now - pushedDate) / (1000 * 60 * 60 * 24 * 30);
  
  // Health (Vitality): decays over time without activity
  const vitality = Math.max(0, 1 - (monthsSincePush / 12));
  
  // Innovation: High activity + small/new repo = potential breakout
  const activityScore = Math.min(1.0, repo.open_issues_count / 10 || 0.1);
  const isRecent = monthsSincePush < 3;
  const innovation = isRecent ? activityScore * 0.8 : activityScore * 0.2;
  
  // Gravity: Based on stars and fork density
  const gravity = Math.min(1.0, Math.log10(repo.stargazers_count + 1) / 5);
  
  return { vitality, innovation, gravity };
}

export function processGitHubData(rootRepo: GitHubRepo, forks: GitHubRepo[]): ProcessedGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const rootIntel = calculateIntelligence(rootRepo);
  nodes.push({
    id: rootRepo.full_name,
    label: rootRepo.name,
    stars: rootRepo.stargazers_count,
    size: Math.log2(rootRepo.stargazers_count + 2) * 2,
    isRoot: true,
    vitality: rootIntel.vitality,
    innovation: rootIntel.innovation,
    gravity: rootIntel.gravity,
    languageId: getLanguageId(rootRepo.language),
    pushedYear: new Date(rootRepo.pushed_at).getFullYear(),
  });

  // Add fork nodes
  forks.forEach((fork) => {
    const forkIntel = calculateIntelligence(fork);
    nodes.push({
      id: fork.full_name,
      label: fork.name,
      stars: fork.stargazers_count,
      size: Math.max(1, Math.log2(fork.stargazers_count + 2)),
      isRoot: false,
      vitality: forkIntel.vitality,
      innovation: forkIntel.innovation,
      gravity: forkIntel.gravity,
      languageId: getLanguageId(fork.language),
      pushedYear: new Date(fork.pushed_at).getFullYear(),
    });

    edges.push({
      source: 0,
      target: nodes.length - 1,
    });
  });

  return { nodes, edges };
}

export interface TypedGraph {
  positions: Float32Array; // x, y, z
  nodeData: Float32Array;  // size, stars, isRoot
  intelligence: Float32Array; // v, i, g, year
  edgeIndices: Uint16Array; // source, target
  nodeCount: number;
  edgeCount: number;
}

export function createTypedGraph(graph: ProcessedGraph): TypedGraph {
  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;

  const positions = new Float32Array(nodeCount * 3);
  const nodeData = new Float32Array(nodeCount * 3);
  const intelligence = new Float32Array(nodeCount * 4);
  const edgeIndices = new Uint16Array(edgeCount * 2);

  graph.nodes.forEach((node, i) => {
    nodeData[i * 3] = node.size;
    nodeData[i * 3 + 1] = node.stars;
    nodeData[i * 3 + 2] = node.isRoot ? 1 : 0;
    
    intelligence[i * 4] = node.vitality;
    intelligence[i * 4 + 1] = node.innovation;
    intelligence[i * 4 + 2] = node.gravity;
    intelligence[i * 4 + 3] = node.pushedYear;
  });

  graph.edges.forEach((edge, i) => {
    edgeIndices[i * 2] = edge.source;
    edgeIndices[i * 2 + 1] = edge.target;
  });

  return {
    positions,
    nodeData,
    intelligence,
    edgeIndices,
    nodeCount,
    edgeCount,
  };
}
