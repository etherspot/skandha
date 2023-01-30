import dotenv from 'dotenv';

const result = dotenv.config();
if (result.error) {
  dotenv.config({ path: '.env.default' });
}
import app from './app';
import logger from './logger';
import rocks from './lib/rocksdb-connection';

const PORT = process.env.PORT || 3000;

rocks.open({ createIfMissing: true }, err => {
  if (err) {
    logger.error('Error connecting to RocksDB', {
      data: err
    });
    return;
  }
  logger.info('Connected to RocksDB');
});

app.listen(PORT, () => {
  logger.info(`🌏 Server started at http://localhost:${PORT}`);
});

// Close the Redis connection, when receiving SIGINT
process.on('SIGINT', () => {
  console.log('\n'); /* eslint-disable-line */
  logger.info('Gracefully shutting down');
  logger.info('Closing the RocksDB connection');
  rocks.close(err => {
    if (err) {
      logger.info('Error closing RockDB connection');
    }
  });
});
