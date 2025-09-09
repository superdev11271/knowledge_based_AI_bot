'use client'

import { useState, useEffect } from 'react'
import { Trash2, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface Document {
  fileName: string
  chunkCount: number
  lastUpdated: string
}

interface DocumentManagerProps {
  onDocumentsChange: () => void
}

export default function DocumentManager({ onDocumentsChange }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/delete', {
        method: 'GET'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }
      
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
      setMessage({ type: 'error', text: 'Failed to fetch documents' })
    } finally {
      setLoading(false)
    }
  }

  const deleteDocument = async (fileName: string) => {
    try {
      setDeleteLoading(fileName)
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete document')
      }
      
      const data = await response.json()
      setMessage({ type: 'success', text: data.message })
      
      // Refresh documents list
      await fetchDocuments()
      onDocumentsChange()
    } catch (error) {
      console.error('Error deleting document:', error)
      setMessage({ type: 'error', text: 'Failed to delete document' })
    } finally {
      setDeleteLoading(null)
    }
  }

  const deleteAllDocuments = async () => {
    try {
      setDeleteLoading('all')
      const response = await fetch('/api/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deleteAll: true }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete all documents')
      }
      
      const data = await response.json()
      setMessage({ type: 'success', text: data.message })
      
      // Refresh documents list
      await fetchDocuments()
      onDocumentsChange()
      setShowDeleteAll(false)
    } catch (error) {
      console.error('Error deleting all documents:', error)
      setMessage({ type: 'error', text: 'Failed to delete all documents' })
    } finally {
      setDeleteLoading(null)
    }
  }

  const clearMessage = () => {
    setMessage(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileText className="mr-2 h-6 w-6 text-blue-600" />
          Document Manager
        </h2>
        <button
          onClick={fetchDocuments}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        {documents.length > 0 && (
          <button
            onClick={() => setShowDeleteAll(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete All
          </button>
        )}
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="mr-2 h-5 w-5" />
            ) : (
              <XCircle className="mr-2 h-5 w-5" />
            )}
            {message.text}
          </div>
          <button
            onClick={clearMessage}
            className="ml-4 text-gray-500 hover:text-gray-700"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p>No documents found in the knowledge base.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc.fileName}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">{doc.fileName}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Chunks: {doc.chunkCount}</p>
                    <p>Last Updated: {doc.lastUpdated}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteDocument(doc.fileName)}
                  disabled={deleteLoading === doc.fileName}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg flex items-center transition-colors disabled:opacity-50"
                >
                  {deleteLoading === doc.fileName ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Delete All Documents?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. All documents and their chunks will be permanently removed from the knowledge base.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteAll(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteAllDocuments}
                disabled={deleteLoading === 'all'}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteLoading === 'all' ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
