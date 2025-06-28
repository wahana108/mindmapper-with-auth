/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // HAPUS atau KOMEN baris ini
  basePath: '',
  reactStrictMode: true,
  images: {
    unoptimized: true, // Optional: boleh tetap
  },
};

module.exports = nextConfig;