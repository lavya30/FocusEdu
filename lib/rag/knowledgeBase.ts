// RAG Knowledge Base for Resume Analysis
// This contains the market standards, job requirements, and evaluation criteria

export const resumeKnowledgeBase = [
  // Technical Skills - 2024-2025 Market Trends
  {
    id: "tech-skills-frontend",
    category: "technical_skills",
    content: `Frontend Development Skills (2024-2025):
    - React.js and Next.js are the most in-demand frontend frameworks
    - TypeScript is now preferred over plain JavaScript in most companies
    - Tailwind CSS has become the go-to styling solution
    - State management: Redux Toolkit, Zustand, or React Query
    - Testing: Jest, React Testing Library, Cypress for E2E
    - Performance optimization and Core Web Vitals knowledge
    - Accessibility (a11y) compliance is increasingly important
    - Server-Side Rendering (SSR) and Static Site Generation (SSG)`,
    keywords: ["react", "next.js", "typescript", "frontend", "javascript", "tailwind", "css", "html"]
  },
  {
    id: "tech-skills-backend",
    category: "technical_skills", 
    content: `Backend Development Skills (2024-2025):
    - Node.js with Express or Fastify for JavaScript backends
    - Python with FastAPI or Django for AI/ML integration
    - Go and Rust are growing for high-performance systems
    - GraphQL alongside REST APIs
    - Microservices architecture understanding
    - Message queues: RabbitMQ, Kafka, Redis
    - Database design: PostgreSQL, MongoDB, Redis
    - API security: OAuth 2.0, JWT, rate limiting`,
    keywords: ["node.js", "python", "backend", "api", "express", "django", "fastapi", "graphql", "rest"]
  },
  {
    id: "tech-skills-cloud",
    category: "technical_skills",
    content: `Cloud & DevOps Skills (2024-2025):
    - AWS is the market leader, followed by Azure and GCP
    - Key AWS services: EC2, S3, Lambda, RDS, ECS/EKS
    - Infrastructure as Code: Terraform, AWS CDK, Pulumi
    - Containerization: Docker is essential, Kubernetes for orchestration
    - CI/CD pipelines: GitHub Actions, GitLab CI, Jenkins
    - Monitoring: Datadog, New Relic, Prometheus, Grafana
    - Security: IAM, secrets management, vulnerability scanning
    - Serverless architecture understanding`,
    keywords: ["aws", "azure", "gcp", "cloud", "docker", "kubernetes", "devops", "terraform", "ci/cd"]
  },
  {
    id: "tech-skills-ai",
    category: "technical_skills",
    content: `AI/ML Skills (2024-2025):
    - Large Language Models: GPT, Claude, Llama integration
    - Frameworks: LangChain, LlamaIndex for LLM apps
    - RAG (Retrieval Augmented Generation) systems
    - Vector databases: Pinecone, Chroma, Weaviate
    - Python ML libraries: TensorFlow, PyTorch, scikit-learn
    - MLOps: Model deployment, monitoring, versioning
    - Prompt engineering is a valuable skill
    - Fine-tuning and embeddings knowledge`,
    keywords: ["ai", "ml", "machine learning", "langchain", "llm", "tensorflow", "pytorch", "data science"]
  },
  {
    id: "tech-skills-data",
    category: "technical_skills",
    content: `Data Engineering Skills (2024-2025):
    - SQL is still fundamental and highly valued
    - Data warehouses: Snowflake, BigQuery, Redshift
    - ETL/ELT tools: dbt, Airflow, Fivetran
    - Data visualization: Tableau, Power BI, Looker
    - Big data: Spark, Hadoop ecosystem
    - Real-time processing: Kafka, Flink
    - Data quality and governance
    - Analytics engineering is a growing role`,
    keywords: ["sql", "data", "analytics", "etl", "spark", "snowflake", "bigquery", "database"]
  },

  // Soft Skills
  {
    id: "soft-skills-leadership",
    category: "soft_skills",
    content: `Leadership & Management Skills:
    - Team leadership and mentoring abilities
    - Cross-functional collaboration experience
    - Stakeholder management and communication
    - Project planning and execution
    - Conflict resolution and negotiation
    - Strategic thinking and decision making
    - Performance management and feedback
    - Building inclusive team cultures`,
    keywords: ["leadership", "management", "team lead", "mentor", "manager"]
  },
  {
    id: "soft-skills-communication",
    category: "soft_skills",
    content: `Communication Skills for Tech Roles:
    - Clear technical documentation writing
    - Presenting complex ideas to non-technical stakeholders
    - Active listening and empathy
    - Written communication in remote/async environments
    - Public speaking and demo presentations
    - Code review feedback delivery
    - Meeting facilitation
    - Cross-cultural communication`,
    keywords: ["communication", "presentation", "documentation", "writing"]
  },
  {
    id: "soft-skills-problem-solving",
    category: "soft_skills",
    content: `Problem Solving & Critical Thinking:
    - Analytical approach to debugging
    - Root cause analysis methodology
    - Data-driven decision making
    - Creative solution finding
    - System design thinking
    - Trade-off analysis
    - Risk assessment
    - Continuous improvement mindset`,
    keywords: ["problem solving", "analytical", "critical thinking", "debugging"]
  },

  // Resume Format Best Practices
  {
    id: "resume-format-structure",
    category: "resume_format",
    content: `Resume Structure Best Practices:
    - Keep resume to 1-2 pages maximum
    - Use reverse chronological order for experience
    - Include sections: Contact, Summary, Experience, Skills, Education
    - Use consistent formatting throughout
    - Choose readable fonts: Arial, Calibri, or similar
    - Use 10-12pt font size for body text
    - Include adequate white space
    - Save as PDF to preserve formatting`,
    keywords: ["format", "structure", "layout", "pages", "sections"]
  },
  {
    id: "resume-format-contact",
    category: "resume_format",
    content: `Contact Information Requirements:
    - Professional email address (firstname.lastname@domain.com)
    - Phone number with area code
    - LinkedIn profile URL (customized if possible)
    - GitHub profile for developers
    - Portfolio website if applicable
    - City and state (full address not required)
    - No personal information like age, photo, or marital status`,
    keywords: ["contact", "email", "phone", "linkedin", "github", "portfolio"]
  },
  {
    id: "resume-format-summary",
    category: "resume_format",
    content: `Professional Summary Guidelines:
    - 2-4 sentences maximum
    - Lead with years of experience and role
    - Highlight 2-3 key achievements or skills
    - Tailor to the target role
    - Use keywords from job descriptions
    - Avoid first-person pronouns
    - Make it compelling and specific
    - Include a value proposition`,
    keywords: ["summary", "objective", "profile", "about"]
  },
  {
    id: "resume-format-experience",
    category: "resume_format",
    content: `Work Experience Best Practices:
    - Start each bullet with strong action verbs
    - Use the STAR method: Situation, Task, Action, Result
    - Quantify achievements with numbers and percentages
    - Focus on impact, not just responsibilities
    - Include relevant keywords for ATS systems
    - Show progression and growth
    - Limit to 3-5 bullets per role
    - Recent experience should be more detailed`,
    keywords: ["experience", "work history", "employment", "achievements", "bullets"]
  },
  {
    id: "resume-format-skills",
    category: "resume_format",
    content: `Skills Section Optimization:
    - Group skills by category (Languages, Frameworks, Tools)
    - List skills in order of relevance/proficiency
    - Include both technical and relevant soft skills
    - Match skills to job requirements
    - Avoid outdated technologies unless relevant
    - Don't include basic skills like Microsoft Office
    - Be honest about proficiency levels
    - Include certifications with skills`,
    keywords: ["skills", "technologies", "tools", "competencies", "expertise"]
  },

  // Achievement Metrics
  {
    id: "achievements-metrics",
    category: "achievements",
    content: `Quantifying Achievements:
    - Revenue impact: "Increased sales by 25%" or "Generated $500K in new business"
    - Efficiency: "Reduced processing time by 40%" or "Automated 100+ hours of manual work"
    - Scale: "Managed system serving 1M+ users" or "Led team of 8 engineers"
    - Quality: "Improved test coverage from 40% to 85%" or "Reduced bugs by 60%"
    - Growth: "Grew user base by 200%" or "Expanded to 5 new markets"
    - Cost: "Saved $100K annually" or "Reduced infrastructure costs by 30%"
    - Speed: "Decreased deployment time from days to hours"
    - Customer: "Improved NPS score by 20 points"`,
    keywords: ["metrics", "numbers", "quantify", "achievements", "results", "impact"]
  },

  // ATS Optimization
  {
    id: "ats-optimization",
    category: "ats",
    content: `ATS (Applicant Tracking System) Optimization:
    - Use standard section headings
    - Avoid tables, graphics, and complex formatting
    - Include keywords from job description
    - Use standard fonts and formatting
    - Don't put important info in headers/footers
    - Use both spelled out and abbreviated terms (e.g., "Artificial Intelligence (AI)")
    - Submit in PDF or Word format as requested
    - Avoid special characters and icons`,
    keywords: ["ats", "applicant tracking", "keywords", "optimization", "parsing"]
  },

  // Industry-Specific Guidance
  {
    id: "industry-startup",
    category: "industry",
    content: `Startup Resume Tips:
    - Emphasize versatility and wearing multiple hats
    - Show entrepreneurial mindset and initiative
    - Highlight rapid learning and adaptability
    - Include side projects and hackathon wins
    - Show comfort with ambiguity
    - Emphasize impact over process
    - Include growth stage experience
    - Show passion for the industry/product`,
    keywords: ["startup", "entrepreneurial", "fast-paced", "growth"]
  },
  {
    id: "industry-enterprise",
    category: "industry",
    content: `Enterprise/Corporate Resume Tips:
    - Emphasize scale and complexity handled
    - Show experience with enterprise tools (Jira, Confluence)
    - Highlight compliance and security awareness
    - Include cross-team collaboration examples
    - Show process improvement initiatives
    - Emphasize stakeholder management
    - Include certifications (AWS, Azure, etc.)
    - Show experience with legacy system modernization`,
    keywords: ["enterprise", "corporate", "large scale", "fortune 500"]
  },

  // Common Mistakes
  {
    id: "common-mistakes",
    category: "mistakes",
    content: `Common Resume Mistakes to Avoid:
    - Typos and grammatical errors
    - Generic descriptions without specifics
    - Listing duties instead of achievements
    - Including irrelevant experience
    - Using personal pronouns (I, me, my)
    - Inconsistent formatting or tense
    - Missing contact information
    - Outdated or irrelevant skills
    - Too long or too short
    - Unprofessional email address
    - Lying or exaggerating
    - Including salary expectations`,
    keywords: ["mistakes", "errors", "avoid", "wrong", "bad"]
  },

  // Role-Specific Guidance
  {
    id: "role-senior-engineer",
    category: "roles",
    content: `Senior Software Engineer Resume Focus:
    - 5+ years of relevant experience expected
    - Technical leadership and architecture decisions
    - Mentoring junior developers
    - System design and scalability
    - Code review and best practices
    - Cross-team technical collaboration
    - Production incident handling
    - Performance optimization experience`,
    keywords: ["senior", "staff", "principal", "architect", "lead engineer"]
  },
  {
    id: "role-fullstack",
    category: "roles",
    content: `Full Stack Developer Resume Focus:
    - Balance of frontend and backend skills
    - End-to-end feature development
    - Database design and optimization
    - API design and implementation
    - Deployment and DevOps basics
    - Understanding of the full development lifecycle
    - Ability to work across the stack as needed
    - T-shaped skills with depth in one area`,
    keywords: ["fullstack", "full stack", "full-stack", "generalist"]
  },
  {
    id: "role-data-scientist",
    category: "roles",
    content: `Data Scientist Resume Focus:
    - Statistical analysis and modeling skills
    - Machine learning project experience
    - Python, R, SQL proficiency
    - Data visualization abilities
    - Business problem to technical solution translation
    - A/B testing and experimentation
    - Model deployment experience
    - Communication of complex findings`,
    keywords: ["data scientist", "data science", "ml engineer", "analytics"]
  }
];

// Helper to get all content as a single string for simple searches
export function getAllKnowledgeContent(): string {
  return resumeKnowledgeBase.map(item => item.content).join('\n\n');
}

// Get knowledge by category
export function getKnowledgeByCategory(category: string): string {
  return resumeKnowledgeBase
    .filter(item => item.category === category)
    .map(item => item.content)
    .join('\n\n');
}
