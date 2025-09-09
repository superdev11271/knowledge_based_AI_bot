import { NextRequest, NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { Citation } from '@/types/chat'
import { config, validateConfig } from '@/lib/config'
import { defaultRateLimit } from '@/lib/rateLimit'
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyAgent = new HttpsProxyAgent('http://14acbeebb9918:690d36e361@185.124.56.14:12323');
const clientConfig = {
  httpAgent: proxyAgent,
}

// Validate configuration
validateConfig()

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey,
})

// Initialize OpenAI embeddings
// Using text-embedding-3-large for better quality embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: config.openai.apiKey,
  modelName: 'text-embedding-3-large',
},
  clientConfig)
console.log(config.openai.model)
// Initialize OpenAI chat model with optimized parameters
const chatModel = new ChatOpenAI({
  openAIApiKey: config.openai.apiKey,
  modelName: config.openai.model
},
  clientConfig)

// Get Pinecone index
const getIndex = async () => {
  const indexName = config.pinecone.indexName
  return pinecone.index(indexName)
}

// Example filter functions for different use cases
const createFilters = {
  // Filter by source document
  bySource: (source: string) => ({
    source: { $eq: source }
  }),

  // Filter by date range (if you have timestamp metadata)
  byDateRange: (startDate: string, endDate: string) => ({
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }),

  // Filter by chunk index
  byChunkIndex: (minIndex: number, maxIndex: number) => ({
    chunkIndex: {
      $gte: minIndex,
      $lte: maxIndex
    }
  }),

  // Filter by file type
  byFileType: (fileType: string) => ({
    fileType: { $eq: fileType }
  }),

  // Combine multiple filters
  combine: (...filters: any[]) => {
    const combined: any = {}
    filters.forEach(filter => {
      if (filter && typeof filter === 'object' && !Array.isArray(filter)) {
        // Validate that filter has valid Pinecone filter structure
        const keys = Object.keys(filter)
        if (keys.length > 0) {
          // Basic validation: ensure filter has proper structure
          const isValid = keys.every(key => {
            const value = filter[key]
            return typeof value === 'object' && value !== null
          })
          if (isValid) {
            Object.assign(combined, filter)
          }
        }
      }
    })
    return Object.keys(combined).length > 0 ? combined : undefined
  }
}

// Search for relevant documents with enhanced retrieval
const searchDocuments = async (query: string, topK: number = 5, filters?: any) => {
  const index = await getIndex()

  // Create query embedding
  const queryEmbedding = await embeddings.embedQuery(query)

  // Build query parameters
  const queryParams: any = {
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  }

  // Only add filter if it has valid conditions
  if (filters && Object.keys(filters).length > 0) {
    queryParams.filter = filters
  }

  // Search in Pinecone with enhanced parameters
  const searchResponse = await index.query(queryParams)

  return searchResponse.matches || []
}

// Create context from search results with enhanced formatting
const createContext = (matches: any[]) => {
  if (matches.length === 0) {
    return "No relevant documents found in the knowledge base."
  }

  let context = "Retrieved Context:\n\n"

  matches.forEach((match, index) => {
    const metadata = match.metadata
    const score = match.score ? ` (Score: ${match.score.toFixed(3)})` : ''
    context += `[${index + 1}] Source: ${metadata.source}${score}\n`
    if (metadata.title) {
      context += `Title: ${metadata.title}\n`
    }
    if (metadata.summary) {
      context += `Summary: ${metadata.summary}\n`
    }
    context += `Content: ${metadata.text}\n\n`
  })

  return context
}

// Create citations from search results
const createCitations = (matches: any[]): Citation[] => {
  return matches.map((match, index) => ({
    id: match.id || `citation-${index}`,
    content: match.metadata?.text || '',
    source: match.metadata?.source || 'Unknown source',
    page: match.metadata?.page,
    metadata: match.metadata,
  }))
}

// Detect if the user is asking for advertising samples/examples
const isAdSampleRequest = (query: string): boolean => {
  const text = query.toLowerCase()
  const keywords = [
    'ad sample',
    'ad samples',
    'ad example',
    'ad examples',
    'ad copy',
    'ad copies',
    'facebook ad',
    'google ads',
    'linkedin ad',
    'instagram ad',
    'tiktok ad',
    'twitter ad',
    'x ad',
    'youtube ad',
    'display ad',
    'banner ad',
    'ad creative',
    'marketing copy',
    'promo copy',
  ]
  return keywords.some((k) => text.includes(k))
}

// Select prompt template based on request type
const getPromptTemplate = (mode: 'default' | 'ad_samples') => {
  if (mode === 'ad_samples') {
  //   return PromptTemplate.fromTemplate(`

  //       {question}
  //       Please just refer to the following context:
  //       {context}

  // Remember: Always return including the citations in your response:
  //   **Citations**: List of sources used

  // Output:
  // `)
      return PromptTemplate.fromTemplate(`
        You are helpful assistant.
        You can refer the following context to answer user question:
        {context}
        
        Don't rely too heavily on the given context. Use your existing knowledge and use the context as a reference.

        User:{question}
        Your Answer:
  `)
  } else {

    // return PromptTemplate.fromTemplate(`
    //   You are a helpful AI assistant that answers questions based on the provided context from uploaded documents.

    //   Context:
    //   {context}

    //   User Question: {question}

    //   KNOWLEDGE PRECEDENCE POLICY:
    //   1. **Precedence Rule**: Use retrieved context first. Cite inline using [1], [2], etc. If coverage is weak, say so and add a labeled 'General Best Practices' section.

    //   2. **Conflict Rule**: If KB advice conflicts with general knowledge, prefer KB unless it's clearly outdated or unsafe. Then, state the exception and why.

    //   3. **Attribution Rule**: Whenever KB is used, cite sources (creator, title, date/URL). This builds trust and protects IP.

    //   Instructions:
    //   1. Answer the question based on the information provided in the context
    //   2. If the context doesn't contain enough information, acknowledge this and provide general best practices
    //   3. Use inline citations [1], [2], etc. to reference specific sources
    //   Remember: Always return including the citations in your response:
    //     **Citations**: List of sources used

    //   Answer:
    //   `)
    return PromptTemplate.fromTemplate(`
        You are helpful assistant.
        You can refer the following context to answer user question:
        {context}
        

        Don't rely too heavily on the given context. Use your existing knowledge and use the context as a reference.

        
        User:{question}
        Your Answer:
      `)
  }
}

// Generate response using GPT
const generateResponse = async (query: string, context: string, mode: 'default' | 'ad_samples') => {
  const promptTemplate = getPromptTemplate(mode)

  const formattedPrompt = await promptTemplate.format({
    context,
    question: query,
      })
      
  const response = await chatModel.predict(formattedPrompt)
  return response
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    if (!defaultRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const { messages } = await request.json()
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty' },
        { status: 400 }
      )
    }
    // Concatenate all messages for context and query
    // Format: "User: ...\nAssistant: ...\n..."
    const historyText = messages.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')
    // Use the last user message as the main query
    const lastUserMsg = [...messages].reverse().find((msg: any) => msg.role === 'user')?.content || ''

    // Example: You can now use filters like this:
    // const filters = createFilters.bySource('specific-document.pdf')
    // const filters = createFilters.byFileType('application/pdf')
    // const filters = createFilters.combine(
    //   createFilters.bySource('document.pdf'),
    //   createFilters.byChunkIndex(0, 5)
    // )

    // Search for relevant documents using the full history
    const matches = await searchDocuments(historyText)
    // Create context from search results
    const context = createContext(matches)
    // Detect ad-sample intent and generate response with appropriate prompt
    const mode = isAdSampleRequest(lastUserMsg) ? 'ad_samples' : 'default'
    const response = await generateResponse(historyText, context, mode)

    // Create citations
    const citations = createCitations(matches)

    // Log evaluation metrics for tuning
    const evaluationMetrics = {
      query: lastUserMsg,
      history: historyText,
      timestamp: new Date().toISOString(),
      matchesCount: matches.length,
      topScore: matches[0]?.score || 0,
      averageScore: matches.length > 0 ? matches.reduce((sum: number, m: any) => sum + (m.score || 0), 0) / matches.length : 0,
      hasCitations: citations.length > 0,
      responseLength: response.length,
      mode: mode
    }

    console.log('Evaluation Metrics:', JSON.stringify(evaluationMetrics, null, 2))

    return NextResponse.json({
      response,
      citations,
      context: context.substring(0, 200) + '...', // For debugging
      metrics: evaluationMetrics
    })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
