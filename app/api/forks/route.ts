
import { NextRequest, NextResponse } from 'next/server';
import { fetchForks, fetchRepo } from '@/lib/github';
import { processGitHubData, TypedGraph } from '@/lib/graph';
import { runLayout } from '@/lib/layout';

export const runtime = 'edge';

// Budget & Failover Configuration (HENRY FORD SAFETY)
const BUDGET_LIMIT = 1000; // Simulated units per epoch
let currentUsage = 0; // In-memory edge usage (resets on instance recycle)

function serializeTypedGraph(graph: TypedGraph) {
  return {
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    positions: Array.from(graph.positions),
    nodeData: Array.from(graph.nodeData),
    intelligence: Array.from(graph.intelligence),
    edgeIndices: Array.from(graph.edgeIndices),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get('owner');
  const repo = searchParams.get('repo');

  if (!owner || !repo) {
    return NextResponse.json({ error: 'Missing owner or repo' }, { status: 400 });
  }

  // Cost Protection: If budget is exceeded, signal high-traffic mode
  if (currentUsage > BUDGET_LIMIT) {
    return NextResponse.json({ 
        error: 'HIGH TRAFFIC DETECTED: SWITCHING TO STATIC CACHE',
        isFailover: true 
    }, { 
        status: 429,
        headers: {
            'Retry-After': '60',
            'Cache-Control': 'no-store'
        }
    });
  }

  try {
    // Increment usage for this request
    currentUsage += 1;

    const [repoData, forksData] = await Promise.all([
      fetchRepo(owner, repo),
      fetchForks(owner, repo)
    ]);

    const graph = processGitHubData(repoData, forksData);
    const typedGraph = await runLayout(graph);

    return NextResponse.json(serializeTypedGraph(typedGraph), {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        'X-Budget-Usage': currentUsage.toString()
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
