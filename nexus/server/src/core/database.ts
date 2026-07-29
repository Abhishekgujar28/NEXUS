import mongoose from 'mongoose';
import { config } from './config.js';
import { logger } from './logger.js';

export const connectDB = async (attempt = 1): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected');
  } catch (err) {
    if (attempt >= 5) throw err;
    const delay = Math.pow(2, attempt) * 1000;
    logger.warn(`MongoDB connection failed, retrying in ${delay}ms...`);
    await new Promise(r => setTimeout(r, delay));
    return connectDB(attempt + 1);
  }
};
