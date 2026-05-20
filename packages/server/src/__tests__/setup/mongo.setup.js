import fs from 'fs/promises';
import mongoose from 'mongoose';
import path from 'path';
import connectDB, { disconnectDB } from '../../db/index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stateFile = path.join(__dirname, '.mongo-memory-state.json');

beforeAll(async () => {
  try {
    const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
    process.env.MONGO_URI = state.uri;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (mongoose.connection.readyState === 0) {
    await connectDB({ exitOnError: false });
    // Import all models so they register with mongoose
    await import('../../models/index.js');
    // Sync all indexes so background building doesn't race against test queries
    for (const model of Object.values(mongoose.models)) {
        await model.syncIndexes();
    }
  }
});

afterAll(async () => {
  await disconnectDB();
});
