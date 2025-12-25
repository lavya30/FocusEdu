// app/api/recommendations/route.ts

import { NextRequest, NextResponse } from 'next/server';

// Note: Install groq-sdk with: npm install groq-sdk
// If groq-sdk is not installed, comment out the Groq import and generateAIRecommendations function

let Groq: any;
try {
  Groq = require('groq-sdk').default;
} catch (e) {
  console.warn('groq-sdk not installed. AI recommendations will be disabled.');
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

interface StarredCourse {
  title: string;
  [key: string]: unknown;
}

interface RequestBody {
  topic: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  history?: string[];
  starredCourses?: StarredCourse[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { topic, skillLevel, history = [], starredCourses = [] } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    // Check if API keys are configured
    if (!YOUTUBE_API_KEY) {
      console.error('YouTube API key is not configured - videos will be empty');
    }

    if (!GROQ_API_KEY && Groq) {
      console.warn('Groq API key is not configured. Using fallback recommendations for Udemy courses.');
    }

    console.log(`Fetching recommendations for topic: "${topic}" at ${skillLevel} level`);

    // Parallel execution for better performance
    const [youtubeVideos, aiRecommendations] = await Promise.all([
      fetchYouTubeVideos(topic, skillLevel),
      GROQ_API_KEY && Groq 
        ? generateAIRecommendations(topic, skillLevel, history, starredCourses)
        : generateFallbackRecommendations(topic, skillLevel)
    ]);

    console.log(`Recommendations fetched: ${youtubeVideos.length} YouTube videos, ${aiRecommendations.udemyCourses.length} Udemy courses`);

    return NextResponse.json({
      youtubeVideos,
      udemyCourses: aiRecommendations.udemyCourses,
      aiInsights: aiRecommendations.insights
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function fetchYouTubeVideos(topic: string, skillLevel: string) {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key not configured');
    return [];
  }

  try {
    // Filter out generic terms that cause bad search results
    const genericTerms = [
      'advanced technical skills', 'technical skills', 'industry knowledge',
      'professional development', 'best practices', 'specialized tools',
      'advanced problem solving', 'industry best practices'
    ];

    const topicLower = topic.toLowerCase();
    const isGeneric = genericTerms.some(term => topicLower.includes(term));

    if (isGeneric) {
      console.warn(`Generic topic detected: "${topic}" - skipping YouTube search`);
      return [];
    }

    // Construct search query based on skill level
    const levelPrefix = {
      beginner: 'tutorial for beginners',
      intermediate: 'intermediate guide',
      advanced: 'advanced concepts'
    }[skillLevel] || 'tutorial';

    // Create a more specific search query for better results
    // Remove common words that might cause irrelevant results
    const cleanTopic = topic
      .replace(/\b(advanced|technical|skills?|development|practices?)\b/gi, '')
      .trim();

    const searchQuery = cleanTopic ? `${cleanTopic} ${levelPrefix} tutorial course` : `${topic} programming tutorial`;
    
    console.log(`Fetching YouTube videos for: "${searchQuery}" (original topic: "${topic}")`);
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&q=${encodeURIComponent(searchQuery)}&` +
      `type=video&maxResults=10&order=relevance&` +
      `videoDuration=medium&videoEmbeddable=true&` +
      `key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('YouTube API Error:', errorData);
      throw new Error(`YouTube API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      console.warn('No YouTube videos found for:', topic);
      return [];
    }

    console.log(`Found ${data.items.length} YouTube videos for "${topic}"`);

    // Map and return video data
    const videos = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));

    return videos;

  } catch (error) {
    console.error('YouTube API Error:', error);
    return [];
  }
}

async function generateAIRecommendations(
  topic: string,
  skillLevel: string,
  history: string[],
  starredCourses: StarredCourse[]
) {
  if (!Groq || !GROQ_API_KEY) {
    return generateFallbackRecommendations(topic, skillLevel);
  }

  try {
    const groq = new Groq({
      apiKey: GROQ_API_KEY
    });

    const prompt = buildAIPrompt(topic, skillLevel, history, starredCourses);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert education advisor specializing in online learning platforms. Provide course recommendations in valid JSON format only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const aiResponse = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(aiResponse);

    return {
      udemyCourses: parsed.courses || [],
      insights: parsed.insights || ''
    };

  } catch (error) {
    console.error('Groq API Error:', error);
    return generateFallbackRecommendations(topic, skillLevel);
  }
}

function generateFallbackRecommendations(topic: string, skillLevel: string) {
  // Fallback recommendations when AI is unavailable
  const courses = [
    {
      id: `course-${Date.now()}-1`,
      title: `Complete ${topic} Masterclass for ${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}s`,
      description: `Learn ${topic} from scratch with hands-on projects and real-world examples. Perfect for ${skillLevel} level learners.`,
      instructor: 'Industry Expert',
      level: skillLevel,
      url: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(topic)}`,
      rating: 4.5,
      isAiGenerated: true
    },
    {
      id: `course-${Date.now()}-2`,
      title: `${topic} Fundamentals: From Zero to Hero`,
      description: `Master the core concepts of ${topic} with step-by-step guidance and practical exercises designed for ${skillLevel} learners.`,
      instructor: 'Senior Developer',
      level: skillLevel,
      url: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(topic)}`,
      rating: 4.6,
      isAiGenerated: true
    },
    {
      id: `course-${Date.now()}-3`,
      title: `Advanced ${topic} Techniques and Best Practices`,
      description: `Deep dive into ${topic} with advanced techniques, design patterns, and industry best practices for ${skillLevel} developers.`,
      instructor: 'Tech Lead',
      level: skillLevel,
      url: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(topic)}`,
      rating: 4.7,
      isAiGenerated: true
    }
  ];

  return {
    udemyCourses: courses,
    insights: `Based on your interest in ${topic} at ${skillLevel} level, these courses will help you build strong foundations and practical skills. Start with the fundamentals and progress through hands-on projects.`
  };
}

function buildAIPrompt(
  topic: string,
  skillLevel: string,
  history: string[],
  starredCourses: StarredCourse[]
): string {
  const historyContext = history.length > 0
    ? `The user has recently searched for: ${history.join(', ')}.`
    : '';

  const starredContext = starredCourses.length > 0
    ? `The user has starred courses related to: ${starredCourses.map(c => c.title).join(', ')}.`
    : '';

  return `
As an expert education advisor, recommend 5 specific Udemy courses for learning "${topic}" at ${skillLevel} level.

Context:
${historyContext}
${starredContext}

Provide your response as a JSON object with this exact structure:
{
  "courses": [
    {
      "id": "unique-id-1",
      "title": "Specific, realistic course title (e.g., 'Complete React Developer Course 2024' or 'AWS Certified Solutions Architect Associate')",
      "description": "Detailed 2-sentence description explaining what the course covers, what you'll learn, and what projects you'll build",
      "instructor": "Realistic instructor name or expertise (e.g., 'Brad Traversy' or 'Senior Cloud Architect')",
      "level": "${skillLevel}",
      "url": "https://www.udemy.com/courses/search/?q=${encodeURIComponent(topic)}",
      "rating": 4.5,
      "isAiGenerated": true
    }
  ],
  "insights": "A brief 2-3 sentence personalized insight about the user's learning path. Mention why these courses are good for ${skillLevel} learners and how they relate to the topic."
}

Important:
- Course titles must be SPECIFIC and REALISTIC - use actual course naming patterns from Udemy
- Focus on practical, hands-on courses that teach "${topic}" effectively
- Descriptions should mention specific technologies, tools, or concepts covered
- For ${skillLevel} level, adjust complexity appropriately
- All URLs should point to Udemy's search page: https://www.udemy.com/courses/search/?q=${encodeURIComponent(topic)}
- Make recommendations sound like real, popular Udemy courses
- If user history shows progression, acknowledge that in insights
`.trim();
}