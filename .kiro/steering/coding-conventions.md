# Coding Conventions

## TypeScript (Infrastructure Code)

- Target: ES2020, Module: CommonJS
- Strict mode enabled (`strict`, `noImplicitAny`, `strictNullChecks`, `noImplicitReturns`)
- Use single quotes, semicolons, 2-space indentation, trailing commas (es5 style)
- Print width: 100 characters
- Arrow function params always wrapped in parentheses
- Use `aws-cdk-lib` imports (CDK v2 style), not individual `@aws-cdk/*` packages (except alpha modules)
- Organize imports: standard CDK imports first, then application imports, then local imports
- Use the `@orcabus/platform-cdk-constructs` package for shared constructs (deployment pipelines, shared config)
- CDK stacks extend `GitStack` from `@orcabus/platform-cdk-constructs/deployment-stack-pipeline`

## Python (Lambda Functions)

- Lambda handlers live in `app/lambdas/<function_name>_py/<function_name>.py`
- Use `handler()` as the Lambda entry point function name
- Python lambdas are bundled using `@aws-cdk/aws-lambda-python-alpha`

## Shell Scripts (ECS Tasks)

- ECS Docker entrypoints are bash scripts in `app/ecs/<task_name>/docker-entrypoint.sh`
- Helper scripts live in `app/ecs/<task_name>/scripts/`

## Naming Conventions

- CDK construct IDs use PascalCase
- Lambda function directory names use snake_case with `_py` suffix
- Step Function template files use snake_case with `_sfn_template.asl.json` suffix
- Constants are UPPER_SNAKE_CASE
- TypeScript interfaces use PascalCase (no `I` prefix)
- Event sources and detail types defined in infrastructure config

## File Organization

- Each CDK concern gets its own module under `infrastructure/stage/` (e.g., `lambda/`, `step-functions/`, `ecs/`, `event-rules/`)
- Each module exports a builder function (e.g., `buildAllLambdas`, `buildEventBridgeRules`)
- Configuration per stage is defined in `infrastructure/stage/config.ts`
- Constants shared across modules live in `infrastructure/stage/constants.ts`
- Interfaces for stack props live in `infrastructure/stage/interfaces.ts`
