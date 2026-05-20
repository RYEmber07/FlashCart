import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const buildMongoUri = () => {
  const baseUri = process.env.MONGO_URI;
  const dbName = process.env.NODE_ENV === 'test' ? `${DB_NAME}_test` : DB_NAME;

  if (!baseUri) {
    throw new Error('MONGO_URI is not configured');
  }

  const withoutQuery = baseUri.split('?')[0];
  const pathAfterHost = withoutQuery.replace(
    /^mongodb(?:\+srv)?:\/\/[^/]+/,
    ''
  );

  if (pathAfterHost && pathAfterHost !== '/') {
    return baseUri;
  }

  return `${withoutQuery.replace(/\/$/, '')}/${dbName}`;
};

const connectDB = async ({ exitOnError = process.env.NODE_ENV !== 'test' } = {}) => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    const mongoUri = buildMongoUri();
    const connectionInstance = await mongoose.connect(mongoUri);
    console.log(
      `✅ MongoDB Connected! Database: ${connectionInstance.connection.name} | Host: ${connectionInstance.connection.host}`
    );

    return connectionInstance;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    if (exitOnError) {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export default connectDB;
