import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stateFile = path.join(__dirname, '.mongo-memory-state.json');

export default async function globalSetup() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
    },
  });

  const mongoUri = replSet.getUri();
  process.env.MONGO_URI = mongoUri;
  globalThis.__MONGO_MEMORY_REPLSET__ = replSet;
  await fs.writeFile(stateFile, JSON.stringify({ uri: mongoUri }));
}
