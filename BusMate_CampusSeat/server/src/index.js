import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import prisma from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Optional database connection test
    if (prisma) {
      prisma.$connect()
        .then(() => console.log('✅ [Database] Successfully connected to PostgreSQL database via Prisma'))
        .catch(err => {
          console.warn('⚠️  [Database] PostgreSQL connection notice:', err.message);
          console.warn('👉 Please verify your DATABASE_URL in server/.env with your local PostgreSQL password.');
        });
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 [BusMate Live API] Server running at http://localhost:${PORT}`);
      console.log(`📡 [BusMate Live API] Health check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
