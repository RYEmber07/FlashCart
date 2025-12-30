import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
    try {
        const dbName = process.env.NODE_ENV === 'test' ? `${DB_NAME}_test` : DB_NAME;
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGO_URI}/${dbName}`
        );
        console.log(
            `✅ MongoDB Connected! Database: ${dbName} | Host: ${connectionInstance.connection.host}`
        );
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

export default connectDB;
