'use client'

import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import ChatInterface from '@/components/ChatInterface'
import DocumentManager from '@/components/DocumentManager'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Message } from '@/types/chat'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'documents'>('chat')

  const handleSendMessage = async (message: string, allMessages: Message[]) => {
    if (!message.trim()) return;
    // Add user's message immediately to chat history
    setMessages(prev => [...allMessages]);
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: allMessages }),
      });
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date(),
        citations: data.citations || []
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: error instanceof Error
          ? `Error: ${error.message}`
          : 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        citations: []
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  } 

  const handleDocumentsChange = () => {
    // Refresh chat context when documents change
    setMessages([])
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI Chatbot - Phase 1
            </h1>
            <p className="text-gray-600">
              Upload your documents and chat with your knowledge base
            </p>
          </header>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-lg shadow-md p-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-6 py-2 rounded-md transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Chat Interface
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-6 py-2 rounded-md transition-colors ${
                  activeTab === 'documents'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Document Manager
              </button>
            </div>
          </div>

          {activeTab === 'chat' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* File Upload Section */}
              <div className="lg:col-span-1">
                              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
                <FileUpload onUploadSuccess={handleDocumentsChange} />
              </div>
              </div>

              {/* Chat Interface */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-md p-6 h-[600px] flex flex-col">
                  <h2 className="text-xl font-semibold mb-4">Chat Interface</h2>
                  <ChatInterface 
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <DocumentManager onDocumentsChange={handleDocumentsChange} />
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
