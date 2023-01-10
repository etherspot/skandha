import Redis from 'ioredis';
import logger from '../logger';

if (!process.env.REDIS_URL) {
  logger.error('REDIS_URL not specified in environment', new Error('REDIS_URL not specified in environment'));
  process.exit(1);
}

export const redis = new Redis(process.env.REDIS_URL);

export default redis;
