import { config, validateConfig } from '@/lib/config'

describe('Configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('should validate required environment variables', () => {
    // Clear required env vars
    delete process.env.OPENAI_API_KEY
    delete process.env.PINECONE_API_KEY

    expect(() => {
      validateConfig()
    }).toThrow('Configuration validation failed')
  })

  test('should accept valid configuration', () => {
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.PINECONE_API_KEY = 'test-pinecone-key'
    process.env.PINECONE_INDEX_NAME = 'test-index'

    expect(() => {
      validateConfig()
    }).not.toThrow()
  })

  test('should validate temperature range', () => {
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.PINECONE_API_KEY = 'test-pinecone-key'
    process.env.OPENAI_TEMPERATURE = '3.0' // Invalid temperature

    expect(() => {
      validateConfig()
    }).toThrow('OPENAI_TEMPERATURE must be between 0 and 2')
  })
})

