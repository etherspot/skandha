# `@skandha/cli`

> Command line interface for Skandha - ERC-4337 bundler client

## Description

CLI tool to run and manage Skandha bundler instances. Provides commands to start bundler nodes in different modes.

## Installation

```bash
npm install -g @skandha/cli
```

## Usage

### Standalone Mode
Run bundler without P2P networking:

```bash
skandha standalone
```

### Node Mode  
Run bundler with P2P interface:

```bash
skandha node --sepolia
```

## Commands

- **`standalone`** - Run standalone bundler client (no P2P)
- **`node`** - Run bundler node with P2P interface

## Global Options

- `--configFile` - Configuration file path (default: `./config.json`)
- `--dataDir` - Data directory path (default: `~/.skandha/db/`)
- `--testingMode` - Enable testing mode
- `--unsafeMode` - Bypass opcode & stake validation
- `--redirectRpc` - Redirect RPC calls to ETH1 client

## Example

```bash
# Run standalone bundler
skandha standalone --configFile ./my-config.json

# Run P2P node on Sepolia
skandha node --sepolia --testingMode

# Run with custom data directory
skandha standalone --dataDir /custom/path
```

## Configuration

Requires a `config.json` file with bundler settings. See main Skandha documentation for configuration details.

## License

ISC
