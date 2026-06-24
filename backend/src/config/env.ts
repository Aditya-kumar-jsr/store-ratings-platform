import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  apiPublicUrl: process.env.API_PUBLIC_URL ?? 'http://localhost:4000',
  jwtSecret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.API_PUBLIC_URL ?? 'http://localhost:4000'}/api/auth/google/callback`,
  databaseUrl: required(
    'DATABASE_URL',
    'postgres://store_user:store_pass@localhost:5432/store_ratings',
  ),
  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME ?? 'Aditya Kumar Singh',
    email: process.env.SEED_ADMIN_EMAIL ?? 'adityasingh112211@gmail.com',
    address: process.env.SEED_ADMIN_ADDRESS ?? '1 Admin Plaza, Head Office',
  },
};
