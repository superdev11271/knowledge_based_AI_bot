# AI Chatbot - Phase 1

A custom GPT-powered chatbot with knowledge base functionality built with Next.js, Pinecone, and OpenAI.

## Features

### Phase 1 Implementation
- **File Upload**: Support for .txt and .pdf files with drag-and-drop interface
- **Document Processing**: Automatic text extraction and chunking
- **Embeddings**: OpenAI embeddings stored in Pinecone vector database
- **Chat Interface**: Real-time chat with document-based responses
- **Citations**: Source references with metadata
- **Document Management**: View, delete individual documents, or clear entire knowledge base
- **Responsive Design**: Modern UI built with Tailwind CSS

## Prerequisites

- Node.js 18+ 
- OpenAI API key
- Pinecone API key and index

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=strategym

# Pinecone Environment (default: us-east-1-aws, change based on your region)
PINECONE_ENVIRONMENT=us-east-1-aws
```

### 3. Pinecone Setup

1. Create a Pinecone account at [pinecone.io](https://pinecone.io)
2. **Option A - Manual Index Creation:**
   - Create a new index with:
           - Dimension: 1024 (llama-text-embed-v2 dimension - OpenAI text-embedding-3-small with 1024 dimensions)
     - Metric: cosine
     - Name: `ai-chatbot-index` (or update PINECONE_INDEX_NAME in env)
   - Note your environment:
         - **Free tier**: Use `us-east-1-aws` (default) - works in most regions
    - **Alternative free environments**: `us-west1-gcp`, `eu-west1-aws`
    - **Paid plans**: Use your specific environment (e.g., `us-east-1-aws`)

3. **Option B - Auto Index Creation:**
   - The app will automatically create the index if it doesn't exist
   - Uses the standard Pinecone index creation method
   - No manual setup required

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Uploading Documents
1. Drag and drop .txt or .pdf files into the upload area
2. Files are automatically processed and stored as embeddings
3. Each file is chunked into smaller pieces for better retrieval

### Chatting with Documents
1. Ask questions about your uploaded documents
2. The AI will search through your knowledge base
3. Responses include citations to source documents
4. Click on citation numbers to see source information

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # Chat API endpoint
│   │   └── upload/route.ts    # File upload API endpoint
│   ├── layout.tsx
│   ├── page.tsx              # Main application page
│   └── globals.css
├── components/
│   ├── ChatInterface.tsx     # Chat UI component
│   └── FileUpload.tsx        # File upload component
├── types/
│   └── chat.ts              # TypeScript type definitions
└── package.json
```

## API Endpoints

### POST /api/upload
Upload and process documents.

**Request**: FormData with file
**Response**: 
```json
{
  "success": true,
  "message": "File processed successfully. Created 5 chunks.",
  "fileId": "uuid",
  "fileName": "document.pdf",
  "chunks": 5
}
```

### POST /api/chat
Send chat messages and get AI responses.

**Request**:
```json
{
  "message": "What is the main topic of the document?"
}
```

**Response**:
```json
{
  "response": "Based on the document...",
  "citations": [
    {
      "id": "citation-1",
      "content": "Relevant text chunk...",
      "source": "document.pdf",
      "page": 1
    }
  ]
}
```

## Technical Details

### Document Processing
- **Text Files**: Direct UTF-8 encoding
- **PDF Files**: Text extraction using pdf-parse
- **Chunking**: 1000 character chunks with 200 character overlap
- **Embeddings**: OpenAI text-embedding-3-small model (1024 dimensions to match llama-text-embed-v2)

### Vector Search
- **Database**: Pinecone vector database
- **Search**: Cosine similarity with top-k retrieval
- **Metadata**: File source, chunk index, timestamp
- **Embedding Dimension**: OpenAI text-embedding-3-small configured for 1024 dimensions to match your Pinecone index
- **Note**: Uses standard Pinecone SDK. For newer `createIndexForModel` API, update the index creation code in `app/api/upload/route.ts`

### AI Model
- **Model**: GPT-3.5-turbo
- **Temperature**: 0.7 (balanced creativity and accuracy)
- **Context**: Relevant document chunks + user question

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms
The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features
This is Phase 1 of the roadmap. Future phases will include:
- User authentication
- Subscription management
- Advanced document formats
- Team collaboration features

## Troubleshooting

### Common Issues

1. **Pinecone Index Not Found**
   - Ensure the index exists and is accessible
   - Check PINECONE_API_KEY and PINECONE_INDEX_NAME

2. **"403 Country, region, or territory not supported"**
   - This error occurs when using `gcp-starter` in unsupported regions
   - **Solution**: Change PINECONE_ENVIRONMENT to `us-west1-gcp` or `us-east-1-aws`
   - Update your `.env.local` file with the new environment
   - Restart your development server

3. **File Upload Fails**
   - Check file size (max 10MB)
   - Ensure file is .txt or .pdf format
   - Verify OpenAI API key is valid

4. **Chat Not Working**
   - Ensure documents are uploaded first
   - Check browser console for errors
   - Verify all environment variables are set

### Debug Mode
Add `DEBUG=true` to your environment variables for additional logging.

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Open an issue on GitHub
