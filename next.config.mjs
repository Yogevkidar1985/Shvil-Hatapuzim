/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SheetJS חבילה מותקנת מ-CDN tarball — מסומנת כ-external לבנייה תקינה בצד שרת.
  experimental: {
    serverComponentsExternalPackages: ["xlsx"],
  },
};

export default nextConfig;
