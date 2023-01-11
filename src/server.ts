import dotenv from 'dotenv';

const result = dotenv.config();
if (result.error) {
  dotenv.config({ path: '.env.default' });
}
import app from './app';
import etherspotBundlerConfig from './config';
import { EtherspotBundlerClient } from './client';
import logger from './logger';
import { redis } from './lib/redis-connection';

const PORT = process.env.PORT || 3000;

new EtherspotBundlerClient({
  config: etherspotBundlerConfig,
  server: app
});

redis.connect(() => { logger.info('Connected to Redis'); });

app.listen(PORT, () => {
  logger.info(`🌏 Server started at http://localhost:${PORT}`);
});

// Close the Redis connection, when receiving SIGINT
process.on('SIGINT', () => {
  console.log('\n'); /* eslint-disable-line */
  logger.info('Gracefully shutting down');
  logger.info('Closing the Redis connection');
  redis.disconnect(false);
});
