
import * as d3 from 'd3-force';
import { ProcessedGraph, TypedGraph, createTypedGraph } from './graph';

interface LayoutNode extends d3.SimulationNodeDatum {
  index: number;
}

export async function runLayout(graph: ProcessedGraph): Promise<TypedGraph> {
  return new Promise((resolve) => {
    // 1. Language Galaxy Positions
    const GALAXY_RADIUS = 800;
    const galaxyOffsets: Record<number, {x: number, y: number, z: number}> = {};
    
    // Position each language in its own sector of the universe cube
    for(let i = 0; i <= 10; i++) {
        const theta = (i / 11) * Math.PI * 2;
        const phi = Math.acos(2 * (i / 11) - 1);
        galaxyOffsets[i] = {
            x: GALAXY_RADIUS * Math.sin(phi) * Math.cos(theta),
            y: (i - 5) * 100, // Vertical separation
            z: GALAXY_RADIUS * Math.cos(phi)
        };
    }

    const nodes: LayoutNode[] = graph.nodes.map((_, i) => ({ index: i }));
    const links = graph.edges.map(e => ({ source: e.source, target: e.target }));

    // Force-directed layout for the core star systems
    const simulation = d3.forceSimulation<LayoutNode>(nodes)
      .force('link', d3.forceLink<LayoutNode, { source: number, target: number }>(links).id((d) => d.index).distance(100).strength(1))
      .force('charge', d3.forceManyBody().strength(-300))
      .stop();

    for (let i = 0; i < 300; ++i) simulation.tick();

    const typedGraph = createTypedGraph(graph);
    
    nodes.forEach((node, i) => {
      const isRoot = graph.nodes[i].isRoot;
      const langId = graph.nodes[i].languageId;
      const galaxy = galaxyOffsets[langId] || {x: 0, y: 0, z: 0};
      
      if (isRoot) {
          // Stars sit at the heart of their language galaxy
          typedGraph.positions[i * 3] = galaxy.x + (node.x || 0);
          typedGraph.positions[i * 3 + 1] = galaxy.y;
          typedGraph.positions[i * 3 + 2] = galaxy.z + (node.y || 0);
      } else {
          // Forks are placed in orbital rings around their parent (index 0 for now)
          // Mathematical: r = base + log(stars + 1) * scale
          const starCount = graph.nodes[i].stars;
          const r = 20 + Math.log10(starCount + 10) * 40;
          const theta = (i / graph.nodes.length) * Math.PI * 2;
          
          typedGraph.positions[i * 3] = galaxy.x + Math.cos(theta) * r;
          typedGraph.positions[i * 3 + 1] = galaxy.y + Math.sin(theta * 2) * 5; // Vertical variation
          typedGraph.positions[i * 3 + 2] = galaxy.z + Math.sin(theta) * r;
      }
    });

    resolve(typedGraph);
  });
}
