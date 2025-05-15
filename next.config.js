/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverRuntimeConfig: {
    // 增加API的响应体大小限制，用于处理图片
    api: {
      bodyParser: {
        sizeLimit: '50mb',
      },
    },
  }
}

module.exports = nextConfig 