import app from './app';
import logger from './logger';
import config from './config';
import rocks from './lib/rocksdb-connection';

const PORT = config.server.port;

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
  rocks.close(_ => _);
});
