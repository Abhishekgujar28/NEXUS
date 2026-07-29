import winston from 'winston';
import { config } from './config.js';

export const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    config.env === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
            const rid = requestId ? ` [${requestId}]` : '';
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} ${level}${rid}: ${message}${metaStr}`;
          })
        )
  ),
  transports: [new winston.transports.Console()],
});
