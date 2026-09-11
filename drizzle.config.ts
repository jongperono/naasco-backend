import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
    dialect: 'mysql',
    schema: './src/db/schema.ts',
    out: './src/db/migrations',
    dbCredentials: {
        host: process.env.DB_HOST!,
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER!,
        password: process.env.DB_PASSWORD!,
        database: process.env.DB_NAME!,
    },
    verbose: true,
    strict: true,
});