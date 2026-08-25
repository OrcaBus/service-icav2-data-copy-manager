# Project Overview

This is the **ICAv2 Data Copy Manager** service, part of the OrcaBus ecosystem built by the University of Melbourne Centre for Cancer Research. It is an event-driven serverless orchestration service that copies data within or between ICAv2 (Illumina Connected Analytics v2) projects/tenants.

## Architecture

- **Event-driven**: External services send `ICAv2DataCopySync` events to the `OrcaBusMain` EventBridge bus
- **Task Token pattern**: Step Functions use task tokens to wait for async ICAv2 copy job completion
- **Recursive event processing**: Subfolders generate new copy events handled by the same service
- **Heartbeat monitoring**: Scheduled rules check job status and send heartbeats to prevent timeouts
- **Stateful/Stateless split**: DynamoDB + SQS in stateful stack; Lambdas, Step Functions, ECS tasks, EventBridge in stateless stack
- **Multi-environment deployment**: Deployed via CodePipeline across beta, gamma, and prod stages

## Directory Structure

- `bin/deploy.ts` — CDK app entry point (dispatches to stateful or stateless deploy based on `-c deployMode`)
- `infrastructure/toolchain/` — CodePipeline deployment stacks
- `infrastructure/stage/` — Application CDK stacks (stateful + stateless) and all construct modules
- `app/lambdas/` — Python Lambda functions
- `app/ecs/` — Docker-based ECS Fargate tasks
- `app/step-function-templates/` — ASL JSON Step Function definitions
- `app/event-schemas/` — JSON Schema for events
- `test/` — CDK nag compliance tests
