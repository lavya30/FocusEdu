import { NextRequest, NextResponse } from 'next/server';

interface GitHubUser {
  login: string;
  name: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  avatar_url: string;
  html_url: string;
}

interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  created_at: string;
  size: number;
  fork: boolean;
  private: boolean;
}

interface GitHubAnalysisResult {
  overallScore: number;
  username: string;
  profileUrl: string;
  metrics: {
    // 1. Programming Languages Used
    languages: {
      language: string;
      repoCount: number;
      percentage: number;
    }[];
    
    // 2. Activity Level
    activity: {
      totalRepos: number;
      recentCommits: boolean;
      daysSinceLastActivity: number | null;
      activeReposCount: number;
      score: number;
    };
    
    // 3. Project Complexity
    complexity: {
      averageRepoSize: number;
      hasAdvancedProjects: boolean;
      totalStars: number;
      totalForks: number;
      score: number;
    };
    
    // 4. Recent Activity (last 6-12 months)
    recentActivity: {
      reposUpdatedLast6Months: number;
      reposUpdatedLast12Months: number;
      mostActiveMonth: string;
      score: number;
    };
    
    // 5. Open Source Involvement
    openSource: {
      totalStars: number;
      totalForks: number;
      averageStarsPerRepo: number;
      topStarredRepo: string;
      score: number;
    };
  };
  summary: string;
  recommendations: string[];
  improvementIdeas?: string[];
  charts: {
    languageDistribution: Array<{ language: string; percentage: number }>;
    activityTimeline: Array<{ month: string; repos: number }>;
  };
}

// Fetch GitHub user data
async function fetchGitHubUser(username: string): Promise<GitHubUser> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'FocusEdu-GitHubAnalyzer',
    };
    
    // Add GitHub token if available (optional, for higher rate limits)
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // Create timeout controller (compatible with older Node.js versions)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('GitHub user not found');
      }
      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
      throw new Error(`GitHub API error: ${response.statusText} (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }
    if (error.message) {
      throw error;
    }
    throw new Error('Failed to fetch GitHub user data');
  }
}

// Fetch GitHub repositories
async function fetchGitHubRepos(username: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;
  const maxPages = 10; // Limit to prevent infinite loops

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'FocusEdu-GitHubAnalyzer',
    };
    
    // Add GitHub token if available (optional, for higher rate limits)
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    while (page <= maxPages) {
      // Create timeout controller (compatible with older Node.js versions)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `https://api.github.com/users/${username}/repos?per_page=${perPage}&page=${page}&sort=updated`,
        {
          headers,
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          // User has no repos or doesn't exist
          break;
        }
        if (response.status === 403) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
        throw new Error(`GitHub API error: ${response.statusText} (${response.status})`);
      }

      const pageRepos = await response.json();
      if (pageRepos.length === 0) break;

      repos.push(...pageRepos);
      if (pageRepos.length < perPage) break;
      page++;
    }

    return repos;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }
    if (error.message && error.message.includes('rate limit')) {
      throw error;
    }
    if (repos.length > 0) {
      // Return partial results if we got some repos before error
      return repos;
    }
    throw new Error('Failed to fetch GitHub repositories');
  }
}

// 1. Extract Programming Languages
function extractLanguages(repos: GitHubRepo[]) {
  const publicRepos = repos.filter(r => !r.private);
  const languageCounts: Record<string, number> = {};
  
  publicRepos.forEach(repo => {
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  });

  const total = Object.values(languageCounts).reduce((sum, count) => sum + count, 0);
  
  return Object.entries(languageCounts)
    .map(([language, count]) => ({
      language,
      repoCount: count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.repoCount - a.repoCount);
}

// 2. Calculate Activity Level
function calculateActivityLevel(repos: GitHubRepo[]) {
  const publicRepos = repos.filter(r => !r.private);
  const now = Date.now();
  const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const recentRepos = publicRepos.filter(
    repo => new Date(repo.pushed_at).getTime() > thirtyDaysAgo
  );

  const lastActivity = publicRepos
    .map(r => new Date(r.pushed_at).getTime())
    .sort((a, b) => b - a)[0];

  const daysSinceLastActivity = lastActivity
    ? Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24))
    : null;

  // Score: 0-100 based on activity
  let score = 0;
  if (daysSinceLastActivity !== null) {
    if (daysSinceLastActivity <= 7) score = 100;
    else if (daysSinceLastActivity <= 30) score = 80;
    else if (daysSinceLastActivity <= 90) score = 60;
    else if (daysSinceLastActivity <= 180) score = 40;
    else score = 20;
  }

  if (recentRepos.length > 5) score = Math.min(score + 10, 100);
  if (publicRepos.length > 20) score = Math.min(score + 10, 100);

  return {
    totalRepos: publicRepos.length,
    recentCommits: daysSinceLastActivity !== null && daysSinceLastActivity <= 30,
    daysSinceLastActivity,
    activeReposCount: recentRepos.length,
    score: Math.min(score, 100),
  };
}

// 3. Assess Project Complexity
function assessComplexity(repos: GitHubRepo[]) {
  const publicRepos = repos.filter(r => !r.private && !r.fork);
  
  if (publicRepos.length === 0) {
    return {
      averageRepoSize: 0,
      hasAdvancedProjects: false,
      totalStars: 0,
      totalForks: 0,
      score: 0,
    };
  }

  const totalSize = publicRepos.reduce((sum, repo) => sum + repo.size, 0);
  const averageRepoSize = Math.round(totalSize / publicRepos.length);
  const totalStars = publicRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const totalForks = publicRepos.reduce((sum, repo) => sum + repo.forks_count, 0);

  // Consider advanced if: large repos, many stars, or complex descriptions
  const hasAdvancedProjects = 
    averageRepoSize > 500 ||
    totalStars > 50 ||
    publicRepos.some(r => r.description && r.description.length > 100);

  // Score based on complexity indicators
  let score = 0;
  if (averageRepoSize > 1000) score += 30;
  else if (averageRepoSize > 500) score += 20;
  else if (averageRepoSize > 200) score += 10;

  if (totalStars > 100) score += 30;
  else if (totalStars > 50) score += 20;
  else if (totalStars > 20) score += 10;

  if (hasAdvancedProjects) score += 20;
  if (totalForks > 50) score += 20;

  return {
    averageRepoSize,
    hasAdvancedProjects,
    totalStars,
    totalForks,
    score: Math.min(score, 100),
  };
}

// 4. Recent Activity Analysis (6-12 months)
function analyzeRecentActivity(repos: GitHubRepo[]) {
  const publicRepos = repos.filter(r => !r.private);
  const now = Date.now();
  const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;
  const twelveMonthsAgo = now - 365 * 24 * 60 * 60 * 1000;

  const reposUpdatedLast6Months = publicRepos.filter(
    r => new Date(r.pushed_at).getTime() > sixMonthsAgo
  ).length;

  const reposUpdatedLast12Months = publicRepos.filter(
    r => new Date(r.pushed_at).getTime() > twelveMonthsAgo
  ).length;

  // Find most active month
  const monthActivity: Record<string, number> = {};
  publicRepos.forEach(repo => {
    const date = new Date(repo.pushed_at);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthActivity[monthKey] = (monthActivity[monthKey] || 0) + 1;
  });

  const mostActiveMonth = Object.entries(monthActivity)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Score based on recent activity
  let score = 0;
  if (reposUpdatedLast6Months > 10) score = 100;
  else if (reposUpdatedLast6Months > 5) score = 80;
  else if (reposUpdatedLast6Months > 2) score = 60;
  else if (reposUpdatedLast6Months > 0) score = 40;
  else if (reposUpdatedLast12Months > 0) score = 20;

  return {
    reposUpdatedLast6Months,
    reposUpdatedLast12Months,
    mostActiveMonth,
    score,
  };
}

// 5. Open Source Involvement
function analyzeOpenSource(repos: GitHubRepo[]) {
  const publicRepos = repos.filter(r => !r.private);
  
  if (publicRepos.length === 0) {
    return {
      totalStars: 0,
      totalForks: 0,
      averageStarsPerRepo: 0,
      topStarredRepo: 'N/A',
      score: 0,
    };
  }

  const totalStars = publicRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const totalForks = publicRepos.reduce((sum, repo) => sum + repo.forks_count, 0);
  const averageStarsPerRepo = totalStars / publicRepos.length;

  const topStarredRepo = publicRepos
    .sort((a, b) => b.stargazers_count - a.stargazers_count)[0]?.name || 'N/A';

  // Score based on open source metrics
  let score = 0;
  if (totalStars > 500) score = 100;
  else if (totalStars > 200) score = 80;
  else if (totalStars > 100) score = 60;
  else if (totalStars > 50) score = 40;
  else if (totalStars > 20) score = 30;
  else if (totalStars > 0) score = 20;

  if (totalForks > 100) score = Math.min(score + 20, 100);
  else if (totalForks > 50) score = Math.min(score + 15, 100);
  else if (totalForks > 20) score = Math.min(score + 10, 100);

  return {
    totalStars,
    totalForks,
    averageStarsPerRepo: Math.round(averageStarsPerRepo * 10) / 10,
    topStarredRepo,
    score: Math.min(score, 100),
  };
}

// Generate charts data
function generateCharts(repos: GitHubRepo[]) {
  const languages = extractLanguages(repos);
  
  // Activity timeline (last 12 months)
  const now = new Date();
  const months: string[] = [];
  const monthCounts: Record<string, number> = {};

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    months.push(monthKey);
    monthCounts[monthKey] = 0;
  }

  repos.filter(r => !r.private).forEach(repo => {
    const pushedDate = new Date(repo.pushed_at);
    const monthKey = pushedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (monthCounts.hasOwnProperty(monthKey)) {
      monthCounts[monthKey]++;
    }
  });

  return {
    languageDistribution: languages.slice(0, 10).map(l => ({
      language: l.language,
      percentage: l.percentage,
    })),
    activityTimeline: months.map(month => ({
      month,
      repos: monthCounts[month] || 0,
    })),
  };
}

// Generate recommendations
function generateRecommendations(metrics: GitHubAnalysisResult['metrics']): string[] {
  const recommendations: string[] = [];

  if (metrics.languages.length < 3) {
    recommendations.push('Diversify your tech stack - learn and build projects in different programming languages');
  }

  if (metrics.activity.score < 50) {
    recommendations.push('Increase your activity - commit to repositories regularly to show consistent development');
  }

  if (metrics.complexity.score < 50) {
    recommendations.push('Build more complex projects - create repositories with substantial codebases and features');
  }

  if (metrics.recentActivity.reposUpdatedLast6Months === 0) {
    recommendations.push('Update your repositories - recent activity shows you are actively maintaining your code');
  }

  if (metrics.openSource.totalStars < 20) {
    recommendations.push('Focus on building projects that solve real problems - this attracts stars and forks');
  }

  if (recommendations.length === 0) {
    recommendations.push('Keep up the excellent work! Your GitHub profile shows strong development activity');
    recommendations.push('Consider contributing to open source projects to increase visibility');
  }

  return recommendations.slice(0, 5);
}

export async function POST(request: NextRequest) {
  try {
    const { username: rawUsername } = await request.json();

    if (!rawUsername || typeof rawUsername !== 'string') {
      return NextResponse.json(
        { error: 'GitHub username is required' },
        { status: 400 }
      );
    }

    // Sanitize input: accept full GitHub profile URLs, @username, or plain username
    let username = rawUsername.trim();
    username = username.replace(/^https?:\/\/(www\.)?github\.com\//i, '');
    username = username.replace(/^github\.com\//i, '');
    username = username.split(/[\/?#]/)[0];
    username = username.replace(/^@/, '');

    if (!username) {
      return NextResponse.json(
        { error: 'Invalid GitHub username provided' },
        { status: 400 }
      );
    }

    // Fetch GitHub data
    const [user, repos] = await Promise.all([
      fetchGitHubUser(username),
      fetchGitHubRepos(username),
    ]);

    // Extract core metrics
    const languages = extractLanguages(repos);
    const activity = calculateActivityLevel(repos);
    const complexity = assessComplexity(repos);
    const recentActivity = analyzeRecentActivity(repos);
    const openSource = analyzeOpenSource(repos);

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      activity.score * 0.25 +
      complexity.score * 0.25 +
      recentActivity.score * 0.20 +
      openSource.score * 0.30
    );

    // Generate charts
    const charts = generateCharts(repos);

    // Generate recommendations
    const recommendations = generateRecommendations({
      languages,
      activity,
      complexity,
      recentActivity,
      openSource,
    });

    // Generate actionable improvement ideas
    const improvementIdeas = generateImprovementIdeas({
      languages,
      activity,
      complexity,
      recentActivity,
      openSource,
    });

    // Generate summary
    let summary = '';
    if (overallScore >= 80) {
      summary = `Excellent GitHub profile! Strong activity, project complexity, and open-source involvement (${overallScore}/100).`;
    } else if (overallScore >= 60) {
      summary = `Good GitHub profile with solid development activity and projects (${overallScore}/100). Continue building!`;
    } else {
      summary = `Your GitHub profile scores ${overallScore}/100. Focus on regular commits, building complex projects, and open-source contributions.`;
    }

    const analysisResult: GitHubAnalysisResult = {
      overallScore,
      username: user.login,
      profileUrl: user.html_url,
      metrics: {
        languages,
        activity,
        complexity,
        recentActivity,
        openSource,
      },
      summary,
      recommendations,
      improvementIdeas,
      charts,
    };

    return NextResponse.json(analysisResult);
  } catch (error: any) {
    console.error('GitHub analysis error:', error);
    
    // Return more specific error messages
    const errorMessage = error.message || 'Failed to analyze GitHub profile';
    const statusCode = errorMessage.includes('not found') ? 404 : 
                      errorMessage.includes('rate limit') ? 429 : 500;
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// Add GET handler for health check
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'GitHub Analysis API is running' });
}

// Generate actionable improvement ideas based on metrics
function generateImprovementIdeas(metrics: GitHubAnalysisResult['metrics']) {
  const ideas: string[] = [];

  // Activity suggestions
  if (metrics.activity.score < 50) {
    ideas.push('Increase commit frequency: aim for small daily or weekly commits to showcase consistency.');
    ideas.push('Set a contribution schedule and use issues/projects to track progress.');
  } else {
    ideas.push('Keep committing regularly; add milestone-based releases for larger projects.');
  }

  // Complexity suggestions
  if (metrics.complexity.score < 50) {
    ideas.push('Build at least one medium-sized project with clear modules and tests to demonstrate complexity.');
    ideas.push('Add unit/integration tests and CI (GitHub Actions) to showcase engineering practices.');
  } else {
    ideas.push('Document architecture and add a CONTRIBUTING guide to attract collaborators.');
  }

  // Languages / tech stack
  if (metrics.languages.length < 3) {
    ideas.push('Explore one complementary language or framework to broaden your skillset.');
  } else {
    ideas.push('Create a showcase project combining your top languages to demonstrate cross-tech skills.');
  }

  // Open source suggestions
  if (metrics.openSource.totalStars < 20) {
    ideas.push('Contribute to popular open-source projects: start with docs/bug fixes to build reputation.');
  } else {
    ideas.push('Highlight top-starred projects in your README and pin them on your profile.');
  }

  // Recent activity
  if (metrics.recentActivity.reposUpdatedLast6Months === 0) {
    ideas.push('Update at least one repo in the last 6 months to show current engagement.');
  }

  // General profile polish
  ideas.push('Add a detailed README for key projects that includes screenshots, setup steps, and a demo.');
  ideas.push('Pin 4-6 representative repositories to your profile that demonstrate a range of skills.');

  // Limit to top 8 actionable ideas
  return ideas.slice(0, 8);
}