/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "192.168.57.200",
        port: "5000",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;