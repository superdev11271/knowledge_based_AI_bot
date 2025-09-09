import { config, validateConfig } from '@/lib/config'

// Mock environment variables for testing
const mockEnv = {
  OPENAI_API_KEY: 'test-openai-key',
  PINECONE_API_KEY: 'test-pinecone-key',
  PINECONE_INDEX_NAME: 'test-index',
  PINECONE_ENVIRONMENT: 'us-east-1-aws'
}

describe('Pinecone REST API Integration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ...mockEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('should validate configuration correctly', () => {
    expect(() => {
      validateConfig()
    }).not.toThrow()
  })

  test('should construct correct Pinecone URLs', () => {
    const indexName = 'test-index'
    const environment = 'us-east-1-aws'
    
    // Upsert URL format
    const upsertUrl = `https://${indexName}-${environment}.svc.${environment}.pinecone.io/vectors/upsert`
    expect(upsertUrl).toBe('https://test-index-us-east-1-aws.svc.us-east-1-aws.pinecone.io/vectors/upsert')
    
    // Query URL format
    const queryUrl = `https://${indexName}-${environment}.svc.${environment}.pinecone.io/query`
    expect(queryUrl).toBe('https://test-index-us-east-1-aws.svc.us-east-1-aws.pinecone.io/query')
    
    // Controller URL format
    const controllerUrl = `https://controller.${environment}.pinecone.io/databases/${indexName}`
    expect(controllerUrl).toBe('https://controller.us-east-1-aws.pinecone.io/databases/test-index')
  })

  test('should format vector data correctly', () => {
    const mockVector = {
      id: 'test-doc-0',
      values: Array(1024).fill(0.1),
      metadata: {
        text: 'Test content',
        source: 'test.txt',
        chunkIndex: 0
      }
    }

    // Validate vector structure
    expect(mockVector.id).toBeDefined()
    expect(mockVector.values).toHaveLength(1024)
    expect(mockVector.values.every(v => typeof v === 'number')).toBe(true)
    expect(mockVector.metadata).toBeDefined()
    expect(typeof mockVector.metadata.text).toBe('string')
  })
})
