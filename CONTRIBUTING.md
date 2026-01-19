# Contributing to Octavus SDK

Thank you for your interest in contributing to the Octavus SDK!

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20.0.0+
- [pnpm](https://pnpm.io/) 10.0.0+

### Setup

1. Fork and clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Build all packages:

```bash
pnpm build
```

## Development Workflow

### Building

```bash
# Build all packages
pnpm build

# Build a specific package
pnpm --filter @octavus/core build
```

### Linting & Formatting

```bash
# Run linter
pnpm lint

# Fix lint issues
pnpm lint:fix

# Check formatting
pnpm format:check

# Fix formatting
pnpm format
```

### Type Checking

```bash
pnpm type-check
```

## Package Dependencies

The packages have the following dependency structure:

```
@octavus/core (no dependencies)
    ↑
@octavus/client-sdk
    ↑
@octavus/react

@octavus/core
    ↑
@octavus/server-sdk

@octavus/cli (standalone)
@octavus/docs (standalone)
```

When making changes to `@octavus/core`, ensure you test dependent packages as well.

## Code Style

- Use TypeScript for all code
- Follow the existing code style (enforced by ESLint and Prettier)
- Write meaningful commit messages
- Keep PRs focused on a single change

## Submitting Changes

1. Create a new branch for your changes
2. Make your changes
3. Run `pnpm lint && pnpm type-check && pnpm build`
4. Submit a pull request

## Questions?

If you have questions, feel free to open an issue or reach out to us at dev@octavus.ai.
