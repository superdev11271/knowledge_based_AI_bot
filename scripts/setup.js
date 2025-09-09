#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 AI Chatbot - Phase 1 Setup\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 Creating .env.local file...');
  
  const envContent = `# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=ai-chatbot-index

# Pinecone Environment (default: us-west1-gcp, change based on your region)
PINECONE_ENVIRONMENT=us-west1-gcp
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.local file created');
  console.log('⚠️  Please update the API keys in .env.local before running the app\n');
} else {
  console.log('✅ .env.local file already exists');
}

// Check package.json dependencies
const packagePath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

console.log('\n📦 Checking dependencies...');

const requiredDeps = [
  'next',
  'react',
  'react-dom',
  '@pinecone-database/pinecone',
  'openai',
  'pdf-parse',
  '@langchain/openai',
  '@langchain/pinecone',
  '@langchain/core',
  'uuid',
  'lucide-react'
];

const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);

if (missingDeps.length > 0) {
  console.log('❌ Missing dependencies:', missingDeps.join(', '));
  console.log('Run: npm install');
} else {
  console.log('✅ All required dependencies are installed');
}

console.log('\n🔧 Setup Instructions:');
console.log('1. Get your OpenAI API key from: https://platform.openai.com/api-keys');
console.log('2. Get your Pinecone API key from: https://app.pinecone.io/');
console.log('3. Create a Pinecone index with dimension 1536 and metric cosine');
console.log('4. Update the API keys in .env.local');
console.log('5. Run: npm run dev');
console.log('6. Open http://localhost:3000 in your browser');

console.log('\n📚 For more information, see README.md');
