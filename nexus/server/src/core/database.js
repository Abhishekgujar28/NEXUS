import mongoose from 'mongoose';
import { config } from './config.js';
import { logger } from './logger.js';

const connect = async (attempt = 1) => {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected');
  } catch (err) {
    if (attempt >= 5) throw err;
    const delay = Math.pow(2, attempt) * 1000;
    logger.warn(`MongoDB connection failed, retrying in ${delay}ms...`);
    await new Promise(r => setTimeout(r, delay));
    return connect(attempt + 1);
  }
};

export const connectDB = connect;
