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
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
          }
        }
      )
    }

    const { fileName, deleteAll } = await request.json()

    if (!fileName && !deleteAll) {
      return NextResponse.json(
        { error: 'Either fileName or deleteAll flag is required' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
          }
        }
      )
    }

    const index = await getIndex()

    if (deleteAll) {
      // Delete all records
      const queryResponse = await index.query({
        vector: new Array(3072).fill(0),
        topK: 10000, // increase if needed
        includeMetadata: false
      })
      const idsToDelete = queryResponse.matches?.map(m => m.id) || []
      if (idsToDelete.length === 0) {
        console.log("No vectors to delete");
        return;
      }
      console.log('Ids to delete', idsToDelete)
      await index.deleteMany(idsToDelete)
      console.log(`Deleted ${idsToDelete.length} vectors`);


      return NextResponse.json({
        success: true,
        deletedCount: 'all',
        message: 'All documents deleted successfully'
      },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
          }
        })
    } else {
      console.log('Deleting specific document', fileName)
      const filter = { category: "old" }; // Example: delete all vectors with category="old"

      const queryResponse = await index.query({
        topK: 1000, // We only need IDs, so set topK high enough to capture all matches
        vector: new Array(3072).fill(0),
        filter: {
          source: fileName
        },
        includeValues: false,
        includeMetadata: false,
      });

      // Step 2: Extract IDs
      const idsToDelete = queryResponse.matches?.map(match => match.id) || [];

      if (idsToDelete.length === 0) {
        console.log("No vectors to delete");
        return;
      }
      console.log('Ids to delete', idsToDelete)

      // Step 3: Delete by IDs
      // for (const id of idsToDelete) {
      //   await index.deleteOne(id)
      // }
      await index.deleteMany(idsToDelete)
      console.log(`Deleted ${idsToDelete.length} vectors`);

      return NextResponse.json({
        success: true,
        deletedCount: 'unknown',
        message: `Deleted chunks from ${fileName}`
      },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
          }
        })
    }

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document(s)' },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
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
    if (stats.namespaces && Object.keys(stats.namespaces).length > 0 && false) {
      // const documents = Object.entries(stats.namespaces).map(([namespace, data]) => ({
      //   fileName: namespace,
      //   chunkCount: data.recordCount || 0,
      //   lastUpdated: 'Unknown' // Pinecone doesn't provide this in stats
      // }))

      // return NextResponse.json({
      //   success: true,
      //   documents
      // },
      //   {
      //     status: 200,
      //     headers: {
      //       'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      //     }
      //   }
      // )
    } else {
      // Fallback: try to get some sample documents
      try {
        const queryResponse = await index.query({
          vector: new Array(3072).fill(0), // Dummy vector for metadata query
          topK: 1000,
          includeMetadata: true
        })

        // Extract unique documents
        const documents = new Map()
        queryResponse.matches?.forEach(match => {
          const source = match.metadata?.source
          const timestamp = match.metadata?.timestamp
          if (source && !documents.has(source)) {
            documents.set(source, {
              fileName: source,
              chunkCount: 1,
              lastUpdated: timestamp
            })
          } else if (source) {
            const doc = documents.get(source)
            doc.chunkCount++
          }
        })

        return NextResponse.json({
          success: true,
          documents: Array.from(documents.values())
        },
          {
            status: 200,
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
            }
          }
        )
      } catch (queryError) {
        console.error('Query fallback error:', queryError)
        return NextResponse.json({
          success: true,
          documents: []
        }
          ,
          {
            status: 200,
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
            }
          }
        )
      }
    }

  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json(
      { error: 'Failed to list documents' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    )
  }
}
