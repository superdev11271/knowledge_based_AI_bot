export interface Citation {
  id: string
  content: string
  source: string
  page?: number
  metadata?: Record<string, any>
}

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  citations?: Citation[]
}

export interface ChatRequest {
  message: string
}

export interface ChatResponse {
  response: string
  citations?: Citation[]
}

export interface FileUploadResponse {
  success: boolean
  message: string
  fileId?: string
  fileName?: string
  chunks?: number
}

export interface ChatErrorResponse {
  error: string
  details?: string
}

export interface ApiError {
  message: string
  status?: number
}
