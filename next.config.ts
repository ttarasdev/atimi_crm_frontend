import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    output: 'standalone',
    devIndicators: false,
    allowedDevOrigins: ['192.168.10.209'],
}

export default nextConfig
