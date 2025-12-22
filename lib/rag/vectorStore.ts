// Vector Store for Resume Analysis RAG System
// Uses Chroma DB with HuggingFace Embeddings

import { ChromaClient, Collection } from 'chromadb';
import { resumeKnowledgeBase } from './knowledgeBase';

// Initialize Chroma client (runs embedded/in-memory by default)
const chromaClient = new ChromaClient();

let collection: Collection | null = null;
let initialized = false;

// Initialize the vector store with knowledge base
export async function initializeVectorStore(): Promise<Collection> {
  if (initialized && collection) {
    return collection;
  }

  try {
    // Delete existing collection if it exists (for fresh start)
    try {
      await chromaClient.deleteCollection({ name: 'resume_knowledge' });
    } catch {
      // Collection doesn't exist, that's fine
    }

    // Create new collection with default embedding function
    collection = await chromaClient.createCollection({
      name: 'resume_knowledge',
      metadata: { description: 'Resume analysis knowledge base' },
    });

    // Prepare documents for insertion
    const documents: string[] = [];
    const ids: string[] = [];
    const metadatas: { category: string; keywords: string }[] = [];

    resumeKnowledgeBase.forEach((item) => {
      documents.push(item.content);
      ids.push(item.id);
      metadatas.push({
        category: item.category,
        keywords: item.keywords.join(','),
      });
    });

    // Add documents to collection (Chroma will auto-generate embeddings)
    await collection.add({
      ids,
      documents,
      metadatas,
    });

    initialized = true;
    console.log(`Chroma vector store initialized with ${documents.length} documents`);

    return collection;
  } catch (error) {
    console.error('Failed to initialize Chroma:', error);
    throw error;
  }
}

// Search for relevant documents based on query
export async function searchVectorStore(
  query: string,
  topK: number = 5
): Promise<{ content: string; score: number; category: string }[]> {
  const coll = await initializeVectorStore();

  const results = await coll.query({
    queryTexts: [query],
    nResults: topK,
  });

  if (!results.documents || !results.documents[0]) {
    return [];
  }

  return results.documents[0].map((doc, index) => ({
    content: doc || '',
    score: results.distances?.[0]?.[index] ? 1 - results.distances[0][index] : 0,
    category: (results.metadatas?.[0]?.[index] as { category?: string })?.category || 'unknown',
  }));
}

// Search by category filter
export async function searchByCategory(
  query: string,
  categories: string[],
  topK: number = 5
): Promise<{ content: string; score: number; category: string }[]> {
  const coll = await initializeVectorStore();

  const results = await coll.query({
    queryTexts: [query],
    nResults: topK,
    where: {
      category: { $in: categories },
    },
  });

  if (!results.documents || !results.documents[0]) {
    return [];
  }

  return results.documents[0].map((doc, index) => ({
    content: doc || '',
    score: results.distances?.[0]?.[index] ? 1 - results.distances[0][index] : 0,
    category: (results.metadatas?.[0]?.[index] as { category?: string })?.category || 'unknown',
  }));
}

// Get relevant context for resume analysis using RAG
export async function getRelevantContext(resumeText: string): Promise<string> {
  try {
    // Get general resume best practices
    const formatResults = await searchByCategory(
      'resume format structure best practices',
      ['resume_format', 'achievements', 'ats'],
      3
    );

    // Get skill-specific context based on resume content
    const skillResults = await searchVectorStore(resumeText, 4);

    // Combine unique results
    const seen = new Set<string>();
    const allResults: string[] = [];

    [...formatResults, ...skillResults].forEach((r) => {
      const key = r.content.substring(0, 50);
      if (!seen.has(key) && r.content) {
        seen.add(key);
        allResults.push(r.content);
      }
    });

    const context = allResults.join('\n\n---\n\n');

    return `## Retrieved Market Standards (from Chroma Vector DB):\n\n${context}`;
  } catch (error) {
    console.error('Error retrieving context from Chroma:', error);
    // Fallback to basic context
    return getFallbackContext();
  }
}

// Fallback context if Chroma fails
function getFallbackContext(): string {
  return `## Market Standards (2024-2025):

### In-Demand Technical Skills:
- Frontend: React, Next.js, TypeScript, Tailwind CSS
- Backend: Node.js, Python, Go, GraphQL, REST APIs
- Cloud: AWS, Azure, GCP, Docker, Kubernetes, Terraform
- Data/AI: Python, SQL, TensorFlow, PyTorch, LangChain

### Resume Best Practices:
- Use action verbs: Led, Developed, Implemented, Optimized
- Quantify achievements with metrics (%, $, numbers)
- Keep to 1-2 pages
- Include: Contact, Summary, Experience, Skills, Education
- Tailor keywords for ATS systems

### Soft Skills in Demand:
- Leadership & team collaboration
- Communication (written/verbal)
- Problem-solving
- Agile/Scrum methodologies`;
}
