/** @type {import('next').NextConfig} */
const nextConfig = {
  // File size limits for API routes
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
  // Increase file size limits
  serverRuntimeConfig: {
    maxFileSize: '50mb', // Increased to 50MB
  },
}

module.exports = nextConfig
