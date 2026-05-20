import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stateFile = path.join(__dirname, '.mongo-memory-state.json');

export default async function globalTeardown() {
  const replSet = globalThis.__MONGO_MEMORY_REPLSET__;

  if (replSet) {
    await replSet.stop();
  }

  try {
    await fs.unlink(stateFile);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}
