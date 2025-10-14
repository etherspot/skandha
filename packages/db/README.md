# `@skandha/db`

> Database module for Skandha bundler - provides persistent storage for UserOperations and peer data

## Description

Database abstraction layer supporting both RocksDB (production) and in-memory storage (testing). Handles storage of UserOperations, peer information, and other bundler state.

## Installation

```bash
npm install @skandha/db
```

## Usage

### RocksDB (Production)

```typescript
import { RocksDbController, Namespace } from '@skandha/db';

const db = new RocksDbController('/path/to/db', 'userOps');
await db.start();

// Store data
await db.put('key1', { data: 'value' });

// Retrieve data
const value = await db.get('key1');

// Delete data
await db.del('key1');

await db.stop();
```

### LocalDB (Testing)

```typescript
import { LocalDbController } from '@skandha/db';

const db = new LocalDbController('userOps');
await db.start();

await db.put('key1', { data: 'value' });
const value = await db.get('key1');
```

## API

### Methods

- `get<T>(key: string): Promise<T>` - Retrieve value by key
- `put(key: string, value: Object): Promise<void>` - Store key-value pair
- `del(key: string): Promise<void>` - Delete key
- `getMany<T>(keys: string[]): Promise<T[]>` - Retrieve multiple values
- `start(): Promise<void>` - Initialize database connection
- `stop(): Promise<void>` - Close database connection

### Namespaces

```typescript
enum Namespace {
  userOps = 1,    // UserOperation storage
  peers = 2,      // Peer information
}
```

## Features

- **Dual Storage**: RocksDB for production, in-memory for testing
- **Namespacing**: Separate logical databases
- **JSON Serialization**: Automatic serialization with BigInt support
- **Type Safety**: Generic type support for stored data

## License

MIT
