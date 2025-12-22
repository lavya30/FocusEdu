// lib/types.ts

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string; 
   thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
  duration?: string;
  viewCount?: string;
}

export interface UdemyCourse {
  id: string;
  title: string;
  description: string;
  instructor: string;
  level: string;
  url: string;
  rating?: number;
  isAiGenerated: boolean; // Flag to indicate AI-generated recommendation
}

export interface StarredCourse {
  id: string;
  title: string;
  type: 'youtube' | 'udemy';
  url: string;
  thumbnail?: string;
  starredAt: number;
}

export interface SearchHistory {
  topic: string;
  timestamp: number;
  skillLevel: SkillLevel;
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface RecommendationRequest {
  topic: string;
  skillLevel: SkillLevel;
  history?: string[];
  starredCourses?: StarredCourse[];
}

export interface RecommendationResponse {
  youtubeVideos: YouTubeVideo[];
  udemyCourses: UdemyCourse[];
  aiInsights?: string;
}