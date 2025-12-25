

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Snowfall from 'react-snowfall';
import Navbar from '@/app/components/Navbar';

import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
} from "firebase/firestore";
import { YouTubeVideo, UdemyCourse } from '@/lib/types';


interface AnalysisResult {
  overallScore: number;
  sections: {
    title: string;
    score: number;
    feedback: string;
    suggestions: string[];
  }[];
  marketComparison: {
    strengths: string[];
    gaps: string[];
    inDemandSkills: string[];
  };
  tips: string[];
  summary: string;
}

interface GapAnalysisResult {
  missingSkills: string[];
  matchScore: number;
  strengths: string[];
  gaps: string[];
}

interface WeekPlan {
  week: number;
  skill: string;
  youtubeVideos: YouTubeVideo[];
  udemyCourses: UdemyCourse[];
}

interface LearningPlan {
  weeks: WeekPlan[];
  totalWeeks: number;
}

// Animated counter component
function AnimatedScore({ score, className }: { score: number; className?: string }) {
  const [displayScore, setDisplayScore] = useState(0);
  
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [score]);
  
  return <span className={className}>{displayScore}</span>;
}

// Circular progress component
function CircularProgress({ score, size = 160 }: { score: number; size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedScore / 100) * circumference;
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);
  
  const getColor = (s: number) => {
    if (s >= 80) return { stroke: '#34d399', bg: 'rgba(52, 211, 153, 0.1)' };
    if (s >= 60) return { stroke: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' };
    return { stroke: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' };
  };
  
  const colors = getColor(score);
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(100, 116, 139, 0.2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${colors.stroke})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedScore score={score} className={`text-5xl font-bold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`} />
        <span className="text-slate-500 text-sm">out of 100</span>
      </div>
    </div>
  );
}

// Progress bar component
function ProgressBar({ score, delay = 0 }: { score: number; delay?: number }) {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), delay);
    return () => clearTimeout(timer);
  }, [score, delay]);
  
  const getColor = (s: number) => {
    if (s >= 80) return 'from-emerald-500 to-emerald-400';
    if (s >= 60) return 'from-yellow-500 to-yellow-400';
    return 'from-red-500 to-red-400';
  };
  
  return (
    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
      <div 
        className={`h-full bg-gradient-to-r ${getColor(score)} rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function ResumeAnalysisPage() {
  const router = useRouter();

  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisResult | null>(null);
  const [learningPlan, setLearningPlan] = useState<LearningPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- AUTH GUARD ---------------- */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, [router]);

  /* ---------------- LOAD USER DATA ---------------- */

  useEffect(() => {
    if (!user) return;

    const loadAnalysis = async () => {
      const snap = await getDoc(doc(db, 'resumeAnalysis', user.uid));
      if (snap.exists()) {
        setAnalysis(snap.data().analysis);
      }
    };

    loadAnalysis();
  }, [user]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, DOCX, or TXT file');
      return;
    }
    setFile(file);
    setError(null);
    setAnalysis(null);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === 'text/plain') {
      return await file.text();
    }
    // For PDF and DOCX, we rely on the API to extract text
    // This is just a fallback
    try {
      const text = await file.text();
      return text;
    } catch {
      return '';
    }
  };

  const analyzeResume = async () => {
    if (!file || !user) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/resume-analysis', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze resume');
      }

      const data = await response.json();
      setAnalysis(data);

      // Get extracted text from API response (if available)
      if (data.extractedText && data.extractedText.length > 50) {
        setResumeText(data.extractedText);
        console.log('Resume text extracted from API, length:', data.extractedText.length);
      } else {
        // Fallback: try to extract from file
        try {
          const text = await extractTextFromFile(file);
          if (text && text.length > 50) {
            setResumeText(text);
            console.log('Resume text extracted from file, length:', text.length);
          } else {
            console.warn('Could not extract resume text. Length:', text?.length || 0);
            // Store a note that text extraction failed
            setResumeText(''); // Clear it so user knows they need to paste it
          }
        } catch (extractErr) {
          console.warn('Text extraction error:', extractErr);
          setResumeText(''); // Clear it
        }
      }

      await addDoc(collection(db, "resumeAnalysis"), {
        userId: user.uid,
        email: user.email,
        overallScore: data.overallScore,
        analysis: data,
        createdAt: serverTimestamp(),
      });

    } catch (err) {
      console.error(err);
      setError("Failed to analyze resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateLearningPlan = async () => {
    if (!user) {
      setError('Please log in to generate a learning plan');
      return;
    }

    if (!resumeText || resumeText.trim().length < 50) {
      setError('Please analyze your resume first. The resume text is required for gap analysis.');
      return;
    }

    if (!jobDescription || jobDescription.trim().length < 50) {
      setError('Please paste a job description (at least 50 characters)');
      return;
    }

    setLoadingPlan(true);
    setError(null);
    setGapAnalysis(null);
    setLearningPlan(null);

    try {
      // Step 1: Get gap analysis
      console.log('Generating learning plan...', {
        resumeTextLength: resumeText.length,
        jobDescriptionLength: jobDescription.length,
      });

      const gapResponse = await fetch('/api/jd-gap-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText: resumeText.trim(),
          jobDescription: jobDescription.trim(),
        }),
      });

      console.log('Gap analysis response status:', gapResponse.status);

      if (!gapResponse.ok) {
        let errorMessage = `Failed to analyze gap (Status: ${gapResponse.status})`;
        try {
          const errorText = await gapResponse.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorData.details || errorMessage;
              console.error('Gap analysis error details:', errorData);
            } catch {
              // If not JSON, use the text as error message
              errorMessage = errorText || errorMessage;
              console.error('Gap analysis error (non-JSON):', errorText);
            }
          }
        } catch (textError) {
          console.error('Failed to read error response:', textError);
        }
        throw new Error(errorMessage);
      }

      const gapData: GapAnalysisResult = await gapResponse.json();
      setGapAnalysis(gapData);

      // Step 2: Filter out generic skills that won't give good recommendations
      const genericSkills = [
        'Professional Development',
        'Industry Best Practices',
        'Advanced Problem Solving',
        'Technical Skills',
        'Industry Knowledge',
        'Best Practices',
        'Specialized Tools',
        'Advanced Technical Skills'
      ];

      // Filter skills - remove generic ones
      const filteredSkills = gapData.missingSkills.filter(skill => {
        const skillLower = skill.toLowerCase();
        return !genericSkills.some(generic => 
          skillLower.includes(generic.toLowerCase()) || 
          generic.toLowerCase().includes(skillLower)
        );
      });

      // Use filtered skills, or if we have less than 4, use original but skip generic ones when fetching
      const skillsToUse = filteredSkills.length >= 4 ? filteredSkills : gapData.missingSkills;
      const totalWeeks = Math.min(skillsToUse.length, 6);

      // Step 3: For each missing skill, fetch recommendations
      const weeks: WeekPlan[] = [];
      let weekNumber = 1;

      for (let i = 0; i < totalWeeks; i++) {
        const skill = skillsToUse[i];
        
        // Skip if it's a generic skill - don't fetch recommendations for it
        const isGeneric = genericSkills.some(generic => {
          const skillLower = skill.toLowerCase();
          const genericLower = generic.toLowerCase();
          return skillLower.includes(genericLower) || genericLower.includes(skillLower);
        });

        if (isGeneric) {
          // Skip this skill, don't add a week for it
          console.log(`Skipping generic skill: "${skill}"`);
          continue;
        }
        
        try {
          const recResponse = await fetch('/api/recommendations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              topic: skill,
              skillLevel: 'beginner' as const,
            }),
          });

          if (recResponse.ok) {
            const recData = await recResponse.json();
            weeks.push({
              week: weekNumber,
              skill,
              youtubeVideos: (recData.youtubeVideos || []).slice(0, 2), // 2 YouTube videos
              udemyCourses: (recData.udemyCourses || []).slice(0, 1), // 1 Udemy course
            });
            weekNumber++;
          } else {
            // Fallback if recommendations fail - still add the week but with empty content
            weeks.push({
              week: weekNumber,
              skill,
              youtubeVideos: [],
              udemyCourses: [],
            });
            weekNumber++;
          }
        } catch (err) {
          console.error(`Error fetching recommendations for ${skill}:`, err);
          weeks.push({
            week: weekNumber,
            skill,
            youtubeVideos: [],
            udemyCourses: [],
          });
          weekNumber++;
        }
      }

      const plan: LearningPlan = {
        weeks,
        totalWeeks,
      };

      setLearningPlan(plan);

    } catch (err) {
      console.error('Learning plan generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate learning plan. Please try again.';
      setError(errorMessage);
    } finally {
      setLoadingPlan(false);
    }
  };


  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
    if (score >= 60) return 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
    return 'from-red-500/20 to-red-500/5 border-red-500/30';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Snowfall />
      {/* Subtle grid pattern overlay */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBkPSJNMzAgMzBtLTEgMGExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9nPjwvc3ZnPg==')] opacity-40 pointer-events-none -z-10"></div>
      
      {/* Animated gradient orbs */}
      <div className="fixed top-1/4 -left-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}></div>

      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-12 relative">
        {/* Header */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 backdrop-blur-sm">
            {user && (
              <span className="text-sm text-slate-300">
                Logged in as <span className="text-violet-400">{user.email}</span>
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 bg-clip-text text-transparent leading-tight">
            Analyze Your Resume
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Get AI-powered insights and recommendations to improve your resume based on <span className="text-violet-400">2024-2025 market standards</span>
          </p>
        </section>


        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {['RAG-Powered', 'Chroma Vector DB', 'Llama 3.1 70B', 'Real-time Analysis'].map((feature, i) => (
            <span key={i} className="px-3 py-1 text-xs font-medium text-slate-400 bg-slate-800/50 border border-slate-700/50 rounded-full">
              {feature}
            </span>
          ))}
        </div>
        <div className="flex justify-center mb-8 gap-3">
          <Link
            href="/dashboard"
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all text-sm font-medium"
          >
            📊 View Dashboard
          </Link>
          <Link
            href="/suggestions"
            className="px-6 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-full transition-all border border-slate-600/50 text-sm font-medium"
          >
            💡 AI Suggestions
          </Link>
        </div>

        {/* Upload Section */}
        <section className="mb-12">
          <div
            className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer group overflow-hidden
              ${dragActive 
                ? 'border-violet-500 bg-violet-500/10 scale-[1.02]' 
                : 'border-slate-700 bg-slate-800/20 hover:border-violet-500/50 hover:bg-slate-800/40'
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Animated background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-r from-violet-600/0 via-violet-600/5 to-fuchsia-600/0 transition-opacity duration-500 ${dragActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={handleFileInput}
            />
            
            <div className={`relative w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center transition-transform duration-300 ${dragActive ? 'scale-110 rotate-3' : 'group-hover:scale-105'}`}>
              <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            {file ? (
              <div className="relative">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-xl mb-2">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-white font-medium">{file.name}</span>
                </div>
                <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(1)} KB • Ready to analyze</p>
              </div>
            ) : (
              <div className="relative">
                <p className="text-white text-lg font-medium mb-2">Drop your resume here</p>
                <p className="text-slate-500">or click to browse</p>
                <div className="flex justify-center gap-4 mt-4">
                  {['PDF', 'DOCX', 'TXT'].map((type) => (
                    <span key={type} className="px-3 py-1 text-xs font-medium text-slate-400 bg-slate-700/50 rounded-lg">
                      .{type.toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3 animate-shake">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {file && !analysis && (
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => {
                  setFile(null);
                  setAnalysis(null);
                }}
                className="px-6 py-3.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove File
              </button>
              <button
                onClick={analyzeResume}
                disabled={loading}
                className="group px-8 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Analyze Resume
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        {/* Analysis Results */}
        {analysis && (
          <section className="space-y-8">
            {/* Overall Score Card */}
            <div className={`relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br ${getScoreBg(analysis.overallScore)} border backdrop-blur-sm`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-32 translate-x-32"></div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Overall Resume Score</h2>
                  <p className="text-slate-300 text-lg max-w-md leading-relaxed">{analysis.summary}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${analysis.overallScore >= 80 ? 'bg-emerald-500/20 text-emerald-400' : analysis.overallScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      {analysis.overallScore >= 80 ? '🎉 Excellent' : analysis.overallScore >= 60 ? '📈 Good Progress' : '💪 Needs Work'}
                    </span>
                  </div>
                </div>
                <CircularProgress score={analysis.overallScore} />
              </div>
            </div>

            {/* Section Analysis Grid */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  📊
                </span>
                Section Breakdown
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.sections.map((section, index) => (
                  <div 
                    key={index} 
                    className="group p-5 bg-slate-800/30 border border-slate-700/50 rounded-2xl hover:bg-slate-800/50 hover:border-slate-600 transition-all duration-300 hover:-translate-y-1"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-base font-semibold text-white">{section.title}</h3>
                      <span className={`text-2xl font-bold ${getScoreColor(section.score)}`}>
                        {section.score}
                      </span>
                    </div>
                    <ProgressBar score={section.score} delay={index * 100} />
                    <p className="text-slate-400 text-sm mt-3 mb-3">{section.feedback}</p>
                    {section.suggestions.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-slate-700/50">
                        {section.suggestions.slice(0, 2).map((suggestion, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <svg className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span>{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Market Comparison */}
            <div className="p-6 md:p-8 bg-slate-800/30 border border-slate-700/50 rounded-3xl">
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  🎯
                </span>
                Market Comparison
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Strengths */}
                <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-emerald-400 text-lg">Strengths</h3>
                  </div>
                  <ul className="space-y-3">
                    {analysis.marketComparison.strengths.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-emerald-400 mt-1">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Gaps */}
                <div className="p-5 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-yellow-400 text-lg">Areas to Improve</h3>
                  </div>
                  <ul className="space-y-3">
                    {analysis.marketComparison.gaps.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-yellow-400 mt-1">!</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* In-Demand Skills */}
                <div className="p-5 bg-violet-500/5 border border-violet-500/20 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-violet-400 text-lg">Skills to Add</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.marketComparison.inDemandSkills.map((item, i) => (
                      <span key={i} className="px-3 py-1.5 text-sm text-violet-300 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="relative overflow-hidden p-6 md:p-8 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-violet-500/10 border border-violet-500/20 rounded-3xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl"></div>
              <h2 className="relative text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-violet-500/30 flex items-center justify-center text-lg">
                  💡
                </span>
                Pro Tips to Improve
              </h2>
              <div className="relative grid md:grid-cols-2 gap-4">
                {analysis.tips.map((tip, index) => (
                  <div 
                    key={index} 
                    className="flex items-start gap-4 p-4 bg-slate-900/50 hover:bg-slate-900/70 border border-slate-700/50 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-violet-300 text-sm font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <p className="text-slate-300 text-sm leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <button
                onClick={() => {
                  setFile(null);
                  setAnalysis(null);
                  setResumeText('');
                  setJobDescription('');
                  setGapAnalysis(null);
                  setLearningPlan(null);
                }}
                className="px-6 py-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Analyze Another Resume
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Report
              </button>
            </div>
          </section>
        )}

        {/* Job Description & Learning Plan Section */}
        {analysis && (
          <section className="space-y-8 mt-12">
            <div className="p-6 md:p-8 bg-slate-800/30 border border-slate-700/50 rounded-3xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  📋
                </span>
                Generate Learning Plan from Job Description
              </h2>
              <p className="text-slate-400 mb-6">
                Paste a job description below to get a personalized learning plan with recommended courses and videos for missing skills.
              </p>

              {!resumeText && (
                <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <p className="text-sm text-yellow-400 mb-2">
                    ⚠️ Resume text not available. Please ensure your resume was analyzed successfully.
                  </p>
                  <p className="text-xs text-slate-400">
                    If your resume was analyzed but text extraction failed, you can manually paste your resume text below.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {!resumeText && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Resume Text (Optional - if extraction failed)
                    </label>
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Paste your resume text here if automatic extraction failed..."
                      className="w-full h-32 px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Job Description *
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here..."
                    className="w-full h-48 px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none"
                  />
                </div>

                <button
                  onClick={generateLearningPlan}
                  disabled={loadingPlan || !jobDescription.trim() || (!resumeText || resumeText.trim().length < 50)}
                  className="w-full px-6 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingPlan ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Plan...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Generate Learning Plan
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Gap Analysis Results */}
            {gapAnalysis && (
              <div className="p-6 md:p-8 bg-slate-800/30 border border-slate-700/50 rounded-3xl">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                    🎯
                  </span>
                  Gap Analysis Results
                </h2>
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="p-4 bg-slate-900/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-400 font-semibold">Match Score:</span>
                      <span className={`text-2xl font-bold ${gapAnalysis.matchScore >= 70 ? 'text-emerald-400' : gapAnalysis.matchScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {gapAnalysis.matchScore}%
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900/50 rounded-xl">
                    <div className="text-sm text-slate-400 mb-2">Missing Skills Identified</div>
                    <div className="text-2xl font-bold text-violet-400">{gapAnalysis.missingSkills.length}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Key Missing Skills:</h3>
                    <div className="flex flex-wrap gap-2">
                      {gapAnalysis.missingSkills.map((skill, i) => (
                        <span key={i} className="px-4 py-2 text-sm text-violet-300 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Learning Plan */}
            {learningPlan && (
              <div className="p-6 md:p-8 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-violet-500/10 border border-violet-500/20 rounded-3xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-violet-500/30 flex items-center justify-center text-lg">
                      📚
                    </span>
                    Your {learningPlan.totalWeeks}-Week Learning Plan
                  </h2>
                </div>

                <div className="space-y-6">
                  {learningPlan.weeks.map((weekPlan) => (
                    <div
                      key={weekPlan.week}
                      className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-2xl hover:bg-slate-900/70 transition-all"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-violet-500/30 flex items-center justify-center text-xl font-bold text-white">
                          {weekPlan.week}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">Week {weekPlan.week}</h3>
                          <p className="text-violet-400 font-medium">{weekPlan.skill}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {/* YouTube Videos */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                            YouTube Videos ({weekPlan.youtubeVideos.length})
                          </h4>
                          <div className="space-y-2">
                            {weekPlan.youtubeVideos.length > 0 ? (
                              weekPlan.youtubeVideos.map((video) => (
                                <a
                                  key={video.id}
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-lg transition-all group"
                                >
                                  <div className="flex items-start gap-3">
                                    {video.thumbnail && (
                                      <Image
                                        src={video.thumbnail}
                                        alt={video.title}
                                        width={80}
                                        height={56}
                                        className="w-20 h-14 object-cover rounded shrink-0"
                                        unoptimized
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-white group-hover:text-violet-400 line-clamp-2">
                                        {video.title}
                                      </p>
                                      <p className="text-xs text-slate-400 mt-1">{video.channelTitle}</p>
                                    </div>
                                  </div>
                                </a>
                              ))
                            ) : (
                              <p className="text-sm text-slate-500 italic">No videos available</p>
                            )}
                          </div>
                        </div>

                        {/* Udemy Courses */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0L5.81 3.573v3.574l6.189-3.574 6.191 3.574V3.573zm-.001 13.185l-6.189 3.574v3.574l6.19-3.574 6.191 3.574v-3.574z"/>
                            </svg>
                            Udemy Course ({weekPlan.udemyCourses.length})
                          </h4>
                          <div className="space-y-2">
                            {weekPlan.udemyCourses.length > 0 ? (
                              weekPlan.udemyCourses.map((course) => (
                                <a
                                  key={course.id}
                                  href={course.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-lg transition-all group"
                                >
                                  <p className="text-sm font-medium text-white group-hover:text-violet-400 line-clamp-2 mb-1">
                                    {course.title}
                                  </p>
                                  <p className="text-xs text-slate-400 line-clamp-2">{course.description}</p>
                                  {course.rating && (
                                    <div className="flex items-center gap-1 mt-2">
                                      <span className="text-xs text-yellow-400">★</span>
                                      <span className="text-xs text-slate-400">{course.rating}</span>
                                    </div>
                                  )}
                                </a>
                              ))
                            ) : (
                              <p className="text-sm text-slate-500 italic">No courses available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Loading State */}
        {loading && (
          <section className="text-center py-16">
            <div className="inline-block p-8 bg-slate-800/50 rounded-3xl border border-slate-700/50 backdrop-blur-sm">
              {/* Animated rings */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-violet-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-fuchsia-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                <div className="absolute inset-4 rounded-full border-4 border-transparent border-t-violet-400 animate-spin" style={{ animationDuration: '2s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-white text-lg font-medium mb-2">Analyzing your resume...</p>
              <p className="text-slate-500 text-sm mb-4">Using AI to compare against market standards</p>
              <div className="flex justify-center gap-2">
                {['Parsing', 'Analyzing', 'Comparing'].map((step, i) => (
                  <span 
                    key={step} 
                    className="px-3 py-1 text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/30 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}