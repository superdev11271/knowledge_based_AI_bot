#!/usr/bin/env node

/**
 * Utility script to recreate Pinecone index with correct dimensions
 * Run this when you get dimension mismatch errors
 */

require('dotenv').config()

const { Pinecone } = require('@pinecone-database/pinecone')

async function recreateIndex() {
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws-free'
    })

    const indexName = process.env.PINECONE_INDEX_NAME || 'ai-chatbot-index'
    
    console.log('🔄 Starting index recreation process...')
    console.log(`📊 Index name: ${indexName}`)
    console.log(`🌍 Environment: ${process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws-free'}`)
    
    // Delete existing index if it exists
    try {
      console.log('🗑️  Attempting to delete existing index...')
      await pinecone.deleteIndex(indexName)
      console.log('✅ Existing index deleted successfully')
    } catch (deleteError) {
      console.log('ℹ️  No existing index to delete or delete failed:', deleteError.message)
    }
    
    // Wait for deletion to complete
    console.log('⏳ Waiting for deletion to complete...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Create new index with correct dimensions
    console.log('🏗️  Creating new index with 3072 dimensions...')
    await pinecone.createIndex({
      name: indexName,
      dimension: 3072, // text-embedding-3-large dimensions
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws-free'
        }
      }
    })
    
    console.log('✅ New index created successfully!')
    console.log('⏳ Waiting for index to be ready...')
    
    // Wait for index to be ready
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Verify index exists
    try {
      const index = pinecone.index(indexName)
      console.log('🎉 Index recreation completed successfully!')
      console.log(`📊 New index: ${indexName}`)
      console.log(`🔢 Dimensions: 3072`)
      console.log(`📐 Metric: cosine`)
      console.log('🚀 You can now upload files with text-embedding-3-large embeddings')
    } catch (verifyError) {
      console.error('❌ Failed to verify index:', verifyError.message)
    }
    
  } catch (error) {
    console.error('❌ Failed to recreate index:', error.message)
    process.exit(1)
  }
}

// Run the function
recreateIndex()
