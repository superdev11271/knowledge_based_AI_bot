'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, File, X, CheckCircle } from 'lucide-react'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  status: 'uploading' | 'success' | 'error'
  message?: string
}

interface FileUploadProps {
  onUploadSuccess?: () => void
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileUpload = useCallback(async (files: FileList) => {
    const validFiles = Array.from(files).filter(file => 
      file.type === 'text/plain' || file.type === 'application/pdf'
    )

    if (validFiles.length === 0) {
      alert('Please upload only .txt or .pdf files')
      return
    }

    for (const file of validFiles) {
      const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading'
      }

      setUploadedFiles(prev => [...prev, uploadedFile])

      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileId 
                ? { ...f, status: 'success', message: data.message || 'File uploaded and processed successfully' }
                : f
            )
          )
          // Notify parent component of successful upload
          onUploadSuccess?.()
        } else {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === fileId 
                ? { ...f, status: 'error', message: data.message || 'Upload failed' }
                : f
            )
          )
        }
      } catch (error) {
        console.error('Upload error:', error)
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'error', message: error instanceof Error ? error.message : 'Upload failed' }
              : f
          )
        )
      }
    }
  }, [setUploadedFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files)
    }
  }, [handleFileUpload])

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    return type === 'text/plain' ? <FileText className="w-4 h-4" /> : <File className="w-4 h-4" />
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop your files here, or{' '}
          <label className="text-blue-500 hover:text-blue-700 cursor-pointer">
            browse
            <input
              type="file"
              multiple
              accept=".txt,.pdf"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </p>
        <p className="text-xs text-gray-500">
          Supported formats: .txt, .pdf (Max 10MB per file)
        </p>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Uploaded Files</h3>
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                file.status === 'success' 
                  ? 'border-green-200 bg-green-50' 
                  : file.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                  {file.message && (
                    <p className={`text-xs ${
                      file.status === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {file.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {file.status === 'uploading' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                )}
                {file.status === 'success' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
