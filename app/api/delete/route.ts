import { NextRequest, NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import { config, validateConfig } from '@/lib/config'
import { defaultRateLimit } from '@/lib/rateLimit'

// Validate configuration
validateConfig()

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey,
})

// Get Pinecone index
const getIndex = async () => {
  const indexName = config.pinecone.indexName
  return pinecone.index(indexName)
}

export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    if (!defaultRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const { fileName, deleteAll } = await request.json()
    
    if (!fileName && !deleteAll) {
      return NextResponse.json(
        { error: 'Either fileName or deleteAll flag is required' },
        { status: 400 }
      )
    }
    
    const index = await getIndex()
    
         if (deleteAll) {
       // Delete all records
       await index.deleteAll()
       return NextResponse.json({
         success: true,
         deletedCount: 'all',
         message: 'All documents deleted successfully'
       })
     } else {
       // Delete specific document
       await index.deleteMany({
         filter: {
           source: { $eq: fileName }
         }
       })
       
       return NextResponse.json({
         success: true,
         deletedCount: 'unknown',
         message: `Deleted chunks from ${fileName}`
       })
     }
    
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document(s)' },
      { status: 500 }
    )
  }
}

// GET endpoint to list all documents
export async function GET() {
  try {
    const index = await getIndex()
    
    // Use describeIndexStats to get document count and metadata
    const stats = await index.describeIndexStats()
    
    // If we have namespace stats, use them; otherwise return empty
    if (stats.namespaces && Object.keys(stats.namespaces).length > 0) {
             const documents = Object.entries(stats.namespaces).map(([namespace, data]) => ({
         fileName: namespace,
         chunkCount: data.recordCount || 0,
         lastUpdated: 'Unknown' // Pinecone doesn't provide this in stats
       }))
      
      return NextResponse.json({
        success: true,
        documents
      })
    } else {
             // Fallback: try to get some sample documents
       try {
         const queryResponse = await index.query({
           vector: new Array(3072).fill(0), // Dummy vector for metadata query
           topK: 100,
           includeMetadata: true
         })
        
        // Extract unique documents
        const documents = new Map()
        queryResponse.matches?.forEach(match => {
          const source = match.metadata?.source
          if (source && !documents.has(source)) {
            documents.set(source, {
              fileName: source,
              chunkCount: 1,
              lastUpdated: 'Unknown'
            })
          } else if (source) {
            const doc = documents.get(source)
            doc.chunkCount++
          }
        })
        
        return NextResponse.json({
          success: true,
          documents: Array.from(documents.values())
        })
      } catch (queryError) {
        console.error('Query fallback error:', queryError)
        return NextResponse.json({
          success: true,
          documents: []
        })
      }
    }
    
  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    )
  }
}
