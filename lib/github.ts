
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  language: string | null;
  open_issues_count: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export async function fetchForks(owner: string, repo: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}/forks?sort=stargazers&per_page=100`;
  
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ForkFleet-App',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { 
    headers,
    next: { revalidate: 3600 } // Edge cache for 1 hour
  });

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<GitHubRepo[]>;
}

export async function fetchRepo(owner: string, repo: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ForkFleet-App',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { 
    headers,
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<GitHubRepo>;
}
