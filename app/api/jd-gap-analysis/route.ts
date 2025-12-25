import { NextRequest, NextResponse } from 'next/server';
import { ChatGroq } from '@langchain/groq';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { getRelevantContext } from '@/lib/rag/vectorStore';

// Initialize Groq LLM (only if API key is available)
let llm: ChatGroq | null = null;
if (process.env.GROQ_API_KEY) {
  try {
    llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: 'openai/gpt-oss-120b', // Match the model used in resume-analysis
      temperature: 0.3,
    });
  } catch (error) {
    console.warn('Failed to initialize Groq LLM:', error);
  }
}

interface GapAnalysisRequest {
  resumeText: string;
  jobDescription: string;
}

interface GapAnalysisResult {
  missingSkills: string[]; // 4-6 key missing skills
  matchScore: number; // 0-100
  strengths: string[];
  gaps: string[];
}

// Prompt template for JD-based gap analysis
const gapAnalysisPromptTemplate = PromptTemplate.fromTemplate(`
You are an expert career coach and resume analyst. Compare the following resume against a specific job description to identify key skill gaps.

## Market Standards Context (Retrieved from Knowledge Base):
{marketContext}

## Resume:
{resumeText}

## Job Description:
{jobDescription}

Analyze the resume against the job description and identify the 4-6 most critical missing skills that the candidate needs to learn to be competitive for this role.

Provide your response as a JSON object with this exact structure:
{{
  "missingSkills": ["<skill 1>", "<skill 2>", "<skill 3>", "<skill 4>", "<skill 5>", "<skill 6>"],
  "matchScore": <number 0-100 representing overall fit>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>", "<gap 3>"]
}}

Important:
- Extract SPECIFIC technical skills, frameworks, tools, and technologies mentioned in the JD but missing from the resume
- Focus on concrete, learnable skills that can be taught via YouTube tutorials and Udemy courses
- Examples of good skills: "React", "TypeScript", "AWS Lambda", "Docker", "Kubernetes", "MongoDB", "GraphQL", "Node.js", "Python", "TensorFlow"
- AVOID generic skills like "Problem Solving", "Communication", "Teamwork" - focus on technical skills only
- Return exactly 4-6 skills (no more, no less)
- Each skill should be a specific technology, framework, or tool that appears in the job description
- Match score should reflect how well the resume matches the JD requirements (0-100)
- Return ONLY valid JSON, no additional text or markdown.
`);

// Create the LangChain chain (only if LLM is available)
let gapAnalysisChain: RunnableSequence | null = null;
if (llm) {
  try {
    gapAnalysisChain = RunnableSequence.from([
      gapAnalysisPromptTemplate,
      llm,
      new StringOutputParser(),
    ]);
  } catch (error) {
    console.warn('Failed to create gap analysis chain:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: GapAnalysisRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON with resumeText and jobDescription.' },
        { status: 400 }
      );
    }

    const { resumeText, jobDescription } = body;

    console.log('JD Gap Analysis Request:', {
      resumeTextLength: resumeText?.length || 0,
      jobDescriptionLength: jobDescription?.length || 0,
      hasResumeText: !!resumeText,
      hasJobDescription: !!jobDescription,
    });

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: 'Both resumeText and jobDescription are required' },
        { status: 400 }
      );
    }

    if (resumeText.length < 50 || jobDescription.length < 50) {
      return NextResponse.json(
        { 
          error: 'Resume and job description must be at least 50 characters',
          details: {
            resumeTextLength: resumeText.length,
            jobDescriptionLength: jobDescription.length,
          }
        },
        { status: 400 }
      );
    }

    // Use RAG Vector Store to get relevant context (if available)
    let ragContext = '';
    try {
      console.log('Fetching relevant context from vector store for JD gap analysis...');
      ragContext = await getRelevantContext(resumeText + ' ' + jobDescription);
      console.log('RAG context retrieved, length:', ragContext.length);
    } catch (ragError) {
      console.warn('RAG context retrieval failed, continuing without it:', ragError);
      ragContext = 'Market standards and industry best practices.';
    }

    // Use LangChain with RAG context for gap analysis (if available)
    if (gapAnalysisChain && llm) {
      try {
        const result = await gapAnalysisChain.invoke({
          marketContext: ragContext,
          resumeText: resumeText,
          jobDescription: jobDescription,
        });

        // Parse the JSON response from LLM
        const cleanedResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        let analysis: GapAnalysisResult;
        
        try {
          analysis = JSON.parse(cleanedResult);
        } catch (parseError) {
          console.error('JSON parse error, falling back to rule-based:', parseError);
          throw new Error('Failed to parse LLM response');
        }

        // Ensure we have 4-6 skills and filter out generic ones
        if (analysis.missingSkills && analysis.missingSkills.length > 0) {
          // Filter out generic skills
          const genericPatterns = [
            'professional development', 'industry best practices', 'best practices',
            'technical skills', 'industry knowledge', 'advanced problem solving',
            'specialized tools', 'advanced technical skills'
          ];

          analysis.missingSkills = analysis.missingSkills
            .filter(skill => {
              const skillLower = skill.toLowerCase();
              return !genericPatterns.some(pattern => 
                skillLower.includes(pattern) || pattern.includes(skillLower)
              );
            })
            .slice(0, 6);

          // If less than 4 after filtering, try to extract more from rule-based
          if (analysis.missingSkills.length < 4) {
            const ruleBasedSkills = extractMissingSkillsRuleBased(resumeText, jobDescription);
            const additionalSkills = ruleBasedSkills.filter(skill => {
              const skillLower = skill.toLowerCase();
              return !genericPatterns.some(pattern => 
                skillLower.includes(pattern) || pattern.includes(skillLower)
              ) && !analysis.missingSkills!.some(existing => 
                existing.toLowerCase() === skill.toLowerCase()
              );
            });
            analysis.missingSkills = [...analysis.missingSkills, ...additionalSkills].slice(0, 6);
          }

          // If still less than 4, use rule-based only (no generic padding)
          if (analysis.missingSkills.length < 4) {
            const ruleBasedOnly = extractMissingSkillsRuleBased(resumeText, jobDescription).slice(0, 4);
            analysis.missingSkills = ruleBasedOnly.length > analysis.missingSkills.length 
              ? ruleBasedOnly 
              : analysis.missingSkills;
          }
        } else {
          // Fallback if no skills extracted - use rule-based only
          analysis.missingSkills = extractMissingSkillsRuleBased(resumeText, jobDescription).slice(0, 6);
        }

        // Ensure all required fields exist
        if (!analysis.matchScore) analysis.matchScore = calculateMatchScore(resumeText, jobDescription);
        if (!analysis.strengths) analysis.strengths = ['Resume submitted for analysis'];
        if (!analysis.gaps) analysis.gaps = ['Skill gaps identified'];

        return NextResponse.json(analysis);

      } catch (llmError) {
        console.error('LLM gap analysis error, falling back to rule-based:', llmError);
        // Fall through to rule-based analysis
      }
    } else {
      console.log('LLM not available, using rule-based analysis');
    }

    // Fallback to rule-based analysis
    const missingSkills = extractMissingSkillsRuleBased(resumeText, jobDescription);
    const matchScore = calculateMatchScore(resumeText, jobDescription);

    const fallbackResult: GapAnalysisResult = {
      missingSkills: missingSkills.slice(0, 6),
      matchScore,
      strengths: ['Resume submitted for analysis'],
      gaps: ['Skill gaps identified'],
    };

    return NextResponse.json(fallbackResult);

  } catch (error) {
    console.error('JD gap analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze gap', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Rule-based fallback for extracting missing skills
function extractMissingSkillsRuleBased(resumeText: string, jobDescription: string): string[] {
  const commonTechSkills = [
    'React', 'Angular', 'Vue', 'TypeScript', 'JavaScript', 'Python', 'Java', 'C++', 'C#',
    'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'AWS', 'Azure', 'GCP', 'Docker',
    'Kubernetes', 'CI/CD', 'Jenkins', 'Git', 'GraphQL', 'REST API', 'MongoDB', 'PostgreSQL',
    'MySQL', 'Redis', 'Elasticsearch', 'Machine Learning', 'AI', 'TensorFlow', 'PyTorch',
    'Data Science', 'SQL', 'NoSQL', 'Microservices', 'Agile', 'Scrum', 'DevOps'
  ];

  const jdLower = jobDescription.toLowerCase();
  const resumeLower = resumeText.toLowerCase();

  const missingSkills: string[] = [];

  // Check for each skill in JD but not in resume
  for (const skill of commonTechSkills) {
    const skillLower = skill.toLowerCase();
    if (jdLower.includes(skillLower) && !resumeLower.includes(skillLower)) {
      missingSkills.push(skill);
      if (missingSkills.length >= 6) break;
    }
  }

  // If not enough skills found, try to extract more specific skills from JD
  if (missingSkills.length < 4) {
    // Look for more technology keywords in JD
    const additionalTechKeywords = [
      'terraform', 'ansible', 'gitlab', 'github actions', 'next.js', 'nuxt', 'svelte',
      'fastapi', 'rails', 'laravel', 'spring boot', 'dynamodb', 'cloudformation',
      'go', 'rust', 'kotlin', 'swift', 'machine learning', 'deep learning', 'nlp',
      'computer vision', 'serverless', 'lambda', 'microservices'
    ];
    
    for (const keyword of additionalTechKeywords) {
      if (jdLower.includes(keyword) && !resumeLower.includes(keyword)) {
        const skillName = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!missingSkills.some(s => s.toLowerCase() === skillName.toLowerCase())) {
          missingSkills.push(skillName);
          if (missingSkills.length >= 6) break;
        }
      }
    }
  }

  // Don't add generic skills - return what we found (even if less than 4)
  return missingSkills;
}

// Calculate match score based on keyword overlap
function calculateMatchScore(resumeText: string, jobDescription: string): number {
  const jdWords = new Set(jobDescription.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const resumeWords = new Set(resumeText.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  let matches = 0;
  for (const word of jdWords) {
    if (resumeWords.has(word)) {
      matches++;
    }
  }

  const totalJdWords = jdWords.size;
  if (totalJdWords === 0) return 0;

  return Math.min(100, Math.round((matches / totalJdWords) * 100));
}

