/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // iyzipay paketini external olarak işaretle - filesystem erişimi için gerekli
  serverExternalPackages: ['iyzipay'],
};

module.exports = nextConfig;

