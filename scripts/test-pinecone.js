#!/usr/bin/env node

/**
 * Test script to verify Pinecone connection and configuration
 * Run this before attempting to create indexes
 */

require('dotenv').config()

const { Pinecone } = require('@pinecone-database/pinecone')

async function testPinecone() {
  try {
    console.log('🧪 Testing Pinecone connection and configuration...')
    
    // Check environment variables
    const apiKey = process.env.PINECONE_API_KEY
    const environment = process.env.PINECONE_ENVIRONMENT
    const indexName = process.env.PINECONE_INDEX_NAME
    
    console.log('📋 Environment variables:')
    console.log(`  API Key: ${apiKey ? '✓ Present' : '✗ MISSING'}`)
    console.log(`  Environment: ${environment || 'us-east-1-aws-free (default)'}`)
    console.log(`  Index Name: ${indexName || 'ai-chatbot-index (default)'}`)
    
    if (!apiKey) {
      console.error('❌ PINECONE_API_KEY is required!')
      process.exit(1)
    }
    
    // Test Pinecone connection
    console.log('\n🔌 Testing Pinecone connection...')
    const pinecone = new Pinecone({
      apiKey: apiKey,
      environment: environment || 'us-east-1-aws-free'
    })
    
    // Test basic API access
    console.log('📡 Testing API access...')
    const indexes = await pinecone.listIndexes()
    console.log('✓ API access successful')
    console.log(`📊 Found ${indexes.length} existing indexes:`)
    
    if (indexes.length > 0) {
      indexes.forEach(index => {
        console.log(`  - ${index.name} (${index.dimension} dimensions, ${index.metric})`)
      })
    } else {
      console.log('  No existing indexes found')
    }
    
    // Test if our target index exists
    const targetIndexName = indexName || 'ai-chatbot-index'
    console.log(`\n🎯 Checking target index: ${targetIndexName}`)
    
    const existingIndex = indexes.find(index => index.name === targetIndexName)
    if (existingIndex) {
      console.log(`✓ Index exists with ${existingIndex.dimension} dimensions`)
      if (existingIndex.dimension !== 3072) {
        console.log('⚠️  Dimension mismatch detected!')
        console.log(`   Current: ${existingIndex.dimension}`)
        console.log(`   Required: 3072 (text-embedding-3-large)`)
      } else {
        console.log('✅ Index has correct dimensions')
      }
    } else {
      console.log('ℹ️  Target index does not exist')
    }
    
    // Test index creation permissions
    console.log('\n🔐 Testing index creation permissions...')
    try {
      // Try to create a temporary test index
      const testIndexName = `test-${Date.now()}`
      console.log(`Creating test index: ${testIndexName}`)
      
      await pinecone.createIndex({
        name: testIndexName,
        dimension: 1536, // Use smaller dimension for testing
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      })
      
      console.log('✅ Index creation successful!')
      
      // Clean up test index
      console.log('🧹 Cleaning up test index...')
      await pinecone.deleteIndex(testIndexName)
      console.log('✅ Test index deleted')
      
    } catch (createError) {
      console.error('❌ Index creation failed:', createError.message)
      console.error('This might indicate:')
      console.error('  - Invalid API key')
      console.error('  - Insufficient permissions')
      console.error('  - Invalid environment/region')
      console.error('  - Service unavailable')
      
      if (createError.message.includes('404')) {
        console.error('\n🔍 404 Error typically means:')
        console.error('  - Invalid API endpoint')
        console.error('  - Wrong environment value')
        console.error('  - API key doesn\'t have access to this environment')
      }
    }
    
    console.log('\n🎉 Pinecone test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Error details:', error)
    process.exit(1)
  }
}

// Run the test
testPinecone()
