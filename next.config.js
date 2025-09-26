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
  devServer: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 3000, // Port for Next.js to listen to
  },
}

module.exports = nextConfig
