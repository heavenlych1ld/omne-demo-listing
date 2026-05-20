/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/listing-demo",
        destination: "/listing-demo/index.html",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
