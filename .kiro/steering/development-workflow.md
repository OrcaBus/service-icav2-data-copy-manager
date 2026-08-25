# Development Workflow

## Package Manager

- **pnpm 11.10.0** (managed via Corepack, pinned in `packageManager` field)
- Always use `pnpm` commands, never `npm` or `yarn`
- Install dependencies: `pnpm install --frozen-lockfile`

## Build & Test Commands

| Command              | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `make install`       | Install dependencies with frozen lockfile                 |
| `make check`         | Run audit, prettier check, eslint, and pre-commit hooks   |
| `make fix`           | Auto-fix prettier and eslint issues                       |
| `make test`          | Run TypeScript type-check then Jest tests (`tsc && jest`) |
| `pnpm cdk-stateless` | CDK commands for stateless stack                          |
| `pnpm cdk-stateful`  | CDK commands for stateful stack                           |

## Linting & Formatting

- **Prettier** for code formatting (run via `pnpm prettier` / `pnpm prettier-fix`)
- **ESLint 10** (flat config in `eslint.config.mjs`) with `typescript-eslint`
- ESLint ignores the `app/` folder (Python/shell code has its own standards)
- Pre-commit hooks enforce formatting and linting before commits

## Testing

- **Jest 30** with **ts-jest** for TypeScript test compilation
- Tests focus on **CDK nag compliance** (AwsSolutions checks for errors and warnings)
- Test files live in `test/` directory with `.test.ts` suffix
- Run tests: `pnpm test` or `make test`

## Pre-commit Hooks

The following checks run automatically on commit:

- Large file detection (excludes `pnpm-lock.yaml`)
- YAML syntax check
- AWS credential detection
- Private key detection
- End-of-file fixer and trailing whitespace removal
- Branch protection (no direct commits to `main`, `master`, `release/*`)
- Secrets detection (Yelp detect-secrets with baseline)
- ESLint
- Prettier formatting check

## CI/CD

Pull requests trigger two GitHub Actions jobs:

1. **pre-commit-lint-security** — Full lint, format, audit, and security scanning
2. **test-iac** — CDK nag compliance tests (`pnpm test`)

Both skip draft PRs and ignore-only changes to `.md`, `.svg`, `.drawio`, `.png` files.

## CDK Deployment

- Deploy mode is selected via CDK context: `-c deployMode=stateless` or `-c deployMode=stateful`
- Infrastructure deploys via CodePipeline from a toolchain account to beta, gamma, and prod
- Always validate changes with `cdk synth` and `pnpm test` before pushing
