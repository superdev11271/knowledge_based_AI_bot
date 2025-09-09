'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, User, Bot, ExternalLink } from 'lucide-react'
import { Message, Citation } from '@/types/chat'

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (message: string, allMessages: Message[]) => void
  isLoading: boolean
}

export default function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim() && !isLoading) {
      onSendMessage(inputMessage, [...messages, {
        id: Date.now().toString(),
        content: inputMessage,
        role: 'user',
        timestamp: new Date(),
        citations: []
      }])
      setInputMessage('')
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp)
  }

  const renderCitations = (citations: Citation[]) => {
    if (!citations || citations.length === 0) return null

    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs text-gray-500 font-medium">Sources:</p>
        {citations.map((citation, index) => (
          <div key={citation.id} className="flex items-start space-x-2 text-xs">
            <span className="text-gray-400">[{index + 1}]</span>
            <div className="flex-1">
              <p className="text-gray-600">{citation.content}</p>
              <div className="flex items-center space-x-1 text-gray-500">
                <span>{citation.source}</span>
                {citation.page && <span>• Page {citation.page}</span>}
                <ExternalLink className="w-3 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Welcome to your AI Chatbot!</p>
            <p className="text-sm">Upload some documents and start asking questions.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex space-x-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className={`text-xs ml-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                
                {message.role === 'assistant' && message.citations && (
                  renderCitations(message.citations)
                )}
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex space-x-3 justify-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask a question about your documents..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
          aria-label="Chat message input"
          aria-describedby={isLoading ? "loading-status" : undefined}
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      {isLoading && (
        <div id="loading-status" className="sr-only">
          Loading response...
        </div>
      )}
    </div>
  )
}
