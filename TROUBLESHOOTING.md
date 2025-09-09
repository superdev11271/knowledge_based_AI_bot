# Troubleshooting Guide

## Common Issues and Solutions

### 1. Vector Dimension Mismatch Error

**Error Message:**
```
Failed to store embeddings in Pinecone: Vector dimension 3072 does not match the dimension of the index 1024
```

**Cause:**
This error occurs when your Pinecone index was created with 1024 dimensions (using `text-embedding-3-small`), but you're now trying to store vectors with 3072 dimensions (from `text-embedding-3-large`).

**Solutions:**

#### Option A: Automatic Fix (Recommended)
The system will automatically detect this error and recreate the index with the correct dimensions. Simply try uploading your file again.

#### Option B: Manual Index Recreation
If automatic recreation fails, you can manually recreate the index:

**Using the API endpoint:**
```bash
curl -X PUT http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d '{"action": "recreate-index"}'
```

**Using the utility script:**
```bash
# Make sure you have the required dependencies
npm install dotenv @pinecone-database/pinecone

# Run the recreation script
node scripts/recreate-index.js
```

**Using the frontend:**
1. Go to the Document Manager tab
2. Click "Delete All Documents" to clear the existing index
3. The system will automatically create a new index with correct dimensions

#### Option C: Environment Variable Override
You can temporarily switch back to the smaller embedding model by setting:
```bash
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### 2. File Size Too Large

**Error Message:**
```
File size too large. Maximum size is 10MB
```

**Solution:**
The file size limit has been increased to 50MB. If you need larger files, you can override this with:
```bash
MAX_FILE_SIZE=104857600  # 100MB
MAX_FILE_SIZE=209715200  # 200MB
```

### 3. Next.js Configuration Warnings

**Warnings:**
```
⚠ Invalid next.config.js options detected:
⚠ Unrecognized key(s) in object: 'appDir' at "experimental"
⚠ Unrecognized key(s) in object: 'api'
```

**Solution:**
These warnings have been resolved by updating the configuration to use modern Next.js options. The warnings should no longer appear.

### 4. PDF Parsing Issues

**Error Message:**
```
s is not a function
```

**Solution:**
This has been resolved by implementing dynamic imports for the `pdf-parse` library. The system now handles PDF parsing more robustly.

### 5. Rate Limiting

**Error Message:**
```
Rate limit exceeded. Please try again later.
```

**Solution:**
Wait a few minutes before trying again. The rate limit is set to prevent abuse of the API endpoints.

## Prevention Tips

1. **Always use consistent embedding models** - Don't switch between `text-embedding-3-small` and `text-embedding-3-large` without recreating the index
2. **Monitor your Pinecone index** - Check the dimensions and metric settings in your Pinecone dashboard
3. **Use environment variables** - Configure your settings via `.env` file for easy management
4. **Test with small files first** - Verify the system works before uploading large documents

## Getting Help

If you continue to experience issues:

1. Check the browser console for detailed error messages
2. Review the server logs for backend errors
3. Verify your environment variables are set correctly
4. Ensure your Pinecone API key and environment are valid
5. Check that your Pinecone index exists and is accessible

## Environment Variables Reference

```bash
# Required
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment

# Optional (with defaults)
PINECONE_INDEX_NAME=ai-chatbot-index
MAX_FILE_SIZE=52428800  # 50MB
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_SEARCH_RESULTS=5
```
