import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', 

  experimental: {
    serverActions: {
      // Allow medical studies (up to 5MB from the booking form) to reach Server Actions.
      // Next.js defaults to 1MB, which blocks file uploads before `bookAppointment` runs.
      bodySizeLimit: '6mb',
      allowedOrigins: [
        'fedecolellafisio.com',         
        'www.fedecolellafisio.com',     
        'bolectioned-pathognomonically-myrtie.ngrok-free.dev', 
        'localhost:3000'
      ]
    }
  }
};

export default nextConfig;
