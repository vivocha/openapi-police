# openapi-police - Claude Development Guide

## Project Overview
OpenAPI v3 validators and utilities for comprehensive API validation and compliance checking.

## Key Commands
- **build**: `pnpm run build` - Compiles TypeScript to JavaScript
- **test**: `pnpm run test` - Runs tests with full build and TypeScript compilation
- **coverage**: `pnpm run cover` - Runs tests with coverage reporting
- **check-coverage**: `pnpm run check-coverage` - Verifies 100% coverage requirement
- **clean**: `pnpm run clean` - Removes build artifacts and compiled test files

## Project Structure
- `src/` - TypeScript source files
- `dist/` - Built JavaScript files
- `test/ts/` - TypeScript test files
- `test/` - Compiled JavaScript test files

## Dependencies
- **jsonpolice**: ^12.0.0 - JSON Schema validation
- **jsonref**: ^9.0.0 - JSON reference resolution

## Build Configuration
- **TypeScript**: 5.5.2 with NodeNext modules targeting ES2022
- **Node.js**: >=18.17.0
- **Coverage**: 100% required (statements, branches, functions, lines)
- **Module**: ESM with .js exports

## Development Notes
- Uses pnpm as package manager
- Tests are written in TypeScript and compiled before running
- All code must maintain 100% test coverage
- Includes semantic-release for automated versioning
- Source maps enabled for debugging