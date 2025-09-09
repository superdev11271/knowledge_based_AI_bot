interface OpenAIConfig {
  apiKey: string
  model: string
  temperature: number
}

interface PineconeConfig {
  apiKey: string
  region: string
  indexName: string
}

interface AppConfig {
  maxFileSize: number
  chunkSize: number
  chunkOverlap: number
  maxSearchResults: number
}

interface Config {
  openai: OpenAIConfig
  pinecone: PineconeConfig
  app: AppConfig
}

const config: Config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-5',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    region: process.env.PINECONE_REGION || 'us-east-1-aws-free',
    indexName: process.env.PINECONE_INDEX_NAME || 'ai-chatbot-index',
  },
  app: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
    chunkSize: parseInt(process.env.CHUNK_SIZE || '1000'),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
    maxSearchResults: parseInt(process.env.MAX_SEARCH_RESULTS || '5'),
  },
}

export function validateConfig(): void {
  const errors: string[] = []

  if (!config.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required')
  }

  if (!config.pinecone.apiKey) {
    errors.push('PINECONE_API_KEY is required')
  } 

  if (!config.pinecone.indexName) {
    errors.push('PINECONE_INDEX_NAME is required')
  }

  if (config.openai.temperature < 0 || config.openai.temperature > 2) {
    errors.push('OPENAI_TEMPERATURE must be between 0 and 2')
  }

  if (config.app.maxFileSize <= 0) {
    errors.push('MAX_FILE_SIZE must be greater than 0')
  }

  if (config.app.chunkSize <= 0) {
    errors.push('CHUNK_SIZE must be greater than 0')
  }

  if (config.app.chunkOverlap < 0 || config.app.chunkOverlap >= config.app.chunkSize) {
    errors.push('CHUNK_OVERLAP must be between 0 and CHUNK_SIZE')
  }

  if (config.app.maxSearchResults <= 0) {
    errors.push('MAX_SEARCH_RESULTS must be greater than 0')
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`)
  }
}

export { config }
