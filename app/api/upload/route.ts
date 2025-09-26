import { NextRequest, NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAIEmbeddings } from '@langchain/openai'
// Dynamic import for pdf-parse to handle compatibility issues
let pdfParse: any = null

// Initialize pdf-parse
const initPdfParse = async () => {
  if (!pdfParse) {
    try {
      const pdfModule = await import('pdf-parse')
      pdfParse = pdfModule.default || pdfModule
    } catch (error) {
      console.error('Failed to import pdf-parse:', error)
      throw new Error('PDF parsing library not available')
    }
  }
  return pdfParse
}
import { v4 as uuidv4 } from 'uuid'
import { config, validateConfig } from '@/lib/config'
import { defaultRateLimit } from '@/lib/rateLimit'

// Configure for larger file uploads
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes
export const dynamic = 'force-dynamic'

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
})

// Get or create index
const getIndex = async () => {
  const indexName = config.pinecone.indexName

  try {
    return pinecone.index(indexName)
  } catch (error) {
    console.log(`Index ${indexName} not found, creating...`)

    try {
      // Create index if it doesn't exist
      await pinecone.createIndex({
        name: indexName,
        dimension: 3072, // text-embedding-3-large dimensions
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1' // Use hardcoded region for now
          }
        }
      })

      // Wait for index to be ready
      let attempts = 0
      const maxAttempts = 30
      while (attempts < maxAttempts) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000))
          const index = pinecone.index(indexName)
          if (index) {
            console.log(`Index ${indexName} created and ready`)
            return index
          }
        } catch (err) {
          attempts++
          if (attempts >= maxAttempts) {
            throw new Error(`Failed to create index ${indexName} after ${maxAttempts} attempts`)
          }
        }
      }
      throw new Error(`Failed to create index ${indexName}`)
    } catch (createError) {
      console.error('Failed to create Pinecone index:', createError)
      throw new Error(`Failed to create or access Pinecone index: ${createError instanceof Error ? createError.message : 'Unknown error'}`)
    }
  }
}

const recreateIndex = async () => {
  try {
    console.log('Attempting to recreate Pinecone index with correct dimensions...')
    console.log('Pinecone config:', {
      apiKey: config.pinecone.apiKey ? '***' : 'MISSING',
      environment: config.pinecone.region,
      indexName: config.pinecone.indexName
    })

    // Delete existing index if it exists
    try {
      console.log(`Attempting to delete index: ${config.pinecone.indexName}`)
      await pinecone.deleteIndex(config.pinecone.indexName)
      console.log('Deleted existing index')
    } catch (deleteError) {
      console.log('No existing index to delete or delete failed:', deleteError)
    }

    // Wait a moment for deletion to complete
    console.log('Waiting for deletion to complete...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Create new index with correct dimensions
    console.log('Creating new index with specifications:', {
      name: config.pinecone.indexName,
      dimension: 3072,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    })

    await pinecone.createIndex({
      name: config.pinecone.indexName,
      dimension: 3072, // text-embedding-3-large dimensions
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: config.pinecone.region
        }
      }
    })

    console.log('Successfully created new index with 3072 dimensions')

    // Wait for index to be ready
    console.log('Waiting for index to be ready...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    return await getIndex()
  } catch (error) {
    console.error('Failed to recreate index:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    throw new Error(`Failed to recreate Pinecone index: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Validate chunking configuration
const validateChunkingConfig = (chunkSize: number, overlap: number): void => {
  if (chunkSize <= 0) {
    throw new Error('Chunk size must be greater than 0')
  }
  if (overlap < 0) {
    throw new Error('Chunk overlap must be non-negative')
  }
  if (overlap >= chunkSize) {
    throw new Error('Chunk overlap must be less than chunk size')
  }
}

// Process text content into chunks with enhanced metadata
const chunkText = (text: string, chunkSize: number = config.app.chunkSize, overlap: number = config.app.chunkOverlap) => {
  // Validate configuration
  validateChunkingConfig(chunkSize, overlap)

  if (!text || text.trim().length === 0) {
    return []
  }
  const chunks: Array<{
    text: string
    title: string
    summary: string
    index: number
  }> = []
  let start = 0
  let chunkIndex = 0

  while (start < text.length) {
    const end = start + chunkSize
    const chunkText = text.slice(start, end)

    // Create a simple title from the first few words
    const firstWords = chunkText.split(' ').slice(0, 3).join(' ')
    const title = firstWords.length > 0 ? firstWords : 'Chunk'

    // Create a summary from the first sentence or first 100 characters
    const firstSentence = chunkText.split(/[.!?]/)[0]
    const summary = firstSentence && firstSentence.length > 10
      ? firstSentence.substring(0, 100) + (firstSentence.length > 100 ? '...' : '')
      : chunkText.substring(0, 100) + (chunkText.length > 100 ? '...' : '')

    chunks.push({
      text: chunkText,
      title,
      summary,
      index: chunkIndex
    })

    const nextStart = end - overlap
    // Guard against invalid configuration that could cause an infinite loop
    start = nextStart <= start ? end : nextStart
    chunkIndex++
  }

  return chunks
}

// Clean text by removing common headers, footers, and boilerplate
const cleanText = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return ''
  }

  // Remove common PDF artifacts and boilerplate
  let cleaned = text
    .replace(/\f/g, '\n') // Replace form feeds with newlines
    .replace(/\r/g, '\n') // Replace carriage returns with newlines
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
    .replace(/^\s+|\s+$/gm, '') // Trim whitespace from each line
    .replace(/Page \d+ of \d+/gi, '') // Remove page numbers
    .replace(/^\d+\s*$/gm, '') // Remove standalone page numbers
    .replace(/^[A-Z\s]+\s*$/gm, '') // Remove all-caps headers
    .replace(/^\s*[-_=*]+\s*$/gm, '') // Remove separator lines

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned
}

// Remove near-duplicate chunks using simple similarity check
const removeNearDuplicates = (chunks: Array<{ text: string; title: string; summary: string; index: number }>) => {
  const uniqueChunks: Array<{ text: string; title: string; summary: string; index: number }> = []

  for (const chunk of chunks) {
    let isDuplicate = false

    for (const uniqueChunk of uniqueChunks) {
      // Simple similarity check: if 80% of words match, consider it a duplicate
      const chunkWords = chunk.text.toLowerCase().split(/\s+/)
      const uniqueWords = uniqueChunk.text.toLowerCase().split(/\s+/)

      const commonWords = chunkWords.filter(word => uniqueWords.includes(word))
      const similarity = commonWords.length / Math.max(chunkWords.length, uniqueWords.length)

      if (similarity > 0.8) {
        isDuplicate = true
        break
      }
    }

    if (!isDuplicate) {
      uniqueChunks.push(chunk)
    }
  }

  return uniqueChunks
}

// Extract text from PDF
const extractTextFromPDF = async (buffer: Buffer): Promise<string> => {
  try {
    const pdfParser = await initPdfParse()
    const data = await pdfParser(buffer)
    const rawText = data.text
    return cleanText(rawText)
  } catch (error) {
    console.error('PDF extraction error:', error)

    // Fallback: try to extract basic text if pdf-parse fails
    try {
      console.log('Attempting fallback PDF text extraction...')
      // Simple fallback - this is basic but might work for some PDFs
      const fallbackText = buffer.toString('utf-8')
      if (fallbackText.length > 100) {
        console.log('Fallback extraction successful')
        return cleanText(fallbackText)
      }
    } catch (fallbackError) {
      console.error('Fallback extraction also failed:', fallbackError)
    }

    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Process and store embeddings
const processAndStoreEmbeddings = async (
  text: string,
  fileName: string,
  fileType: string
) => {
  const index = await getIndex()
  console.log("Found index:", index)
  // Chunk the text
  const chunks = chunkText(text)

  // Remove near-duplicate chunks (simple approach)
  const uniqueChunks = removeNearDuplicates(chunks)
  console.log(`Original chunks: ${chunks.length}, Unique chunks: ${uniqueChunks.length}`)

  // Create embeddings for each chunk
  let vectors: Array<{
    id: string
    values: number[]
    metadata: Record<string, string | number | boolean>
  }> = []

  for (let i = 0; i < uniqueChunks.length; i++) {
    const chunk = uniqueChunks[i]

    try {
      const embedding = await embeddings.embedQuery(chunk.text)

      // Validate embedding
      if (!Array.isArray(embedding)) {
        throw new Error('Embedding generation failed: result is not an array')
      }
      // text-embedding-3-large produces 3072-dimensional vectors
      if (embedding.length !== 3072) {
        throw new Error(`Embedding has invalid length: ${embedding.length}. Expected 3072.`)
      }
      if (!embedding.every((v) => Number.isFinite(v))) {
        throw new Error('Embedding contains non-finite numbers')
      }

      vectors.push({
        id: `${fileName}-${i}`.replace(/\s+/g, '_'),
        values: embedding,
        metadata: {
          text: chunk.text,
          title: chunk.title,
          summary: chunk.summary,
          source: fileName,
          chunkIndex: chunk.index,
          timestamp: new Date().toISOString(),
        },
      })
      if (vectors.length > 100) {
        console.log(`Upserting ${vectors.length} vectors for file: ${fileName}`)
        await index.upsert(vectors)
        console.log(`Successfully stored ${vectors.length} vectors in Pinecone`)
        vectors = []
      }
    } catch (embeddingError) {
      console.error(`Failed to generate embedding for chunk ${i}:`, embeddingError)
      throw new Error(`Failed to generate embedding for chunk ${i}: ${embeddingError instanceof Error ? embeddingError.message : 'Unknown error'}`)
    }
  }

  // Store in Pinecone
  try {
    console.log(`Upserting ${vectors.length} vectors for file: ${fileName}`)
    await index.upsert(vectors)
    console.log(`Successfully stored ${vectors.length} vectors in Pinecone`)
  } catch (err) {
    // Add more context for easier debugging
    console.error('Pinecone upsert error:', err)
    console.error('File:', fileName)
    console.error('Chunks count:', vectors.length)
    console.error('Sample vector (first item):', JSON.stringify(vectors[0]).slice(0, 500))

    // Check if it's a dimension mismatch error
    if (err instanceof Error && err.message.includes('Vector dimension 3072 does not match the dimension of the index 1024')) {
      console.log('Detected dimension mismatch, attempting to recreate index...')
      try {
        const newIndex = await recreateIndex()
        await newIndex.upsert(vectors)
        console.log(`Successfully stored ${vectors.length} vectors in recreated Pinecone index`)
      } catch (recreateErr) {
        console.error('Failed to recreate index and store embeddings:', recreateErr)
        throw new Error(`Failed to recreate index and store embeddings: ${recreateErr instanceof Error ? recreateErr.message : 'Unknown error'}`)
      }
    } else {
      throw new Error(`Failed to store embeddings in Pinecone: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return {
    chunks: uniqueChunks.length,
    fileName,
    fileType,
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    if (!defaultRateLimit(clientIP)) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['text/plain', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Only .txt and .pdf files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > config.app.maxFileSize) {
      const maxSizeMB = Math.round(config.app.maxFileSize / (1024 * 1024))
      const fileSizeMB = Math.round(file.size / (1024 * 1024))
      return NextResponse.json(
        {
          success: false,
          message: `File size too large. File size: ${fileSizeMB}MB, Maximum allowed: ${maxSizeMB}MB.`
        },
        { status: 400 }
      )
    }

    // Validate file is not empty
    if (file.size === 0) {
      return NextResponse.json(
        { success: false, message: 'File is empty.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract text based on file type
    let text: string

    if (file.type === 'text/plain') {
      text = cleanText(buffer.toString('utf-8'))
    } else if (file.type === 'application/pdf') {
      text = await extractTextFromPDF(buffer)
    } else {
      throw new Error('Unsupported file type')
    }

    // Validate extracted text
    if (!text || text.trim().length === 0) {
      return NextResponse.json({
        success: false,
        message: `No text content could be extracted from the file`,
        fileId: uuidv4(),
        fileName: "",
        chunks: 0,
      })
    }

    if (text.trim().length < 50) {
      console.warn(`File ${file.name} contains very little text: ${text.trim().length} characters`)
    }

    // Process and store embeddings
    const result = await processAndStoreEmbeddings(
      text,
      file.name,
      file.type
    )

    return NextResponse.json({
      success: true,
      message: `File processed successfully. Created ${result?.chunks || 0} chunks.`,
      fileId: uuidv4(),
      fileName: file.name,
      chunks: result?.chunks || 0,
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process file'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    if (!defaultRateLimit(clientIP)) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const { action } = await request.json()

    if (action === 'recreate-index') {
      try {
        const newIndex = await recreateIndex()
        return NextResponse.json({
          success: true,
          message: 'Pinecone index recreated successfully with 3072 dimensions',
          indexName: config.pinecone.indexName
        })
      } catch (error) {
        console.error('Failed to recreate index:', error)
        return NextResponse.json(
          {
            success: false,
            message: `Failed to recreate index: ${error instanceof Error ? error.message : 'Unknown error'}`
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action. Use "recreate-index" to recreate the Pinecone index.' },
      { status: 400 }
    )

  } catch (error) {
    console.error('PUT request error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process request'
      },
      { status: 500 }
    )
  }
}
