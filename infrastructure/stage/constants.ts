/* Imports */
import { StageName } from '@orcabus/platform-cdk-constructs/utils';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as path from 'node:path';

/* Directory constants */
export const APP_ROOT = path.join(__dirname, '../../app');
export const LAMBDA_DIR = path.join(APP_ROOT, 'lambdas');
export const STEP_FUNCTIONS_DIR = path.join(APP_ROOT, 'step-function-templates');

/* Internal event bus constants */
export const INTERNAL_EVENT_BUS_DESCRIPTION =
  'Event bus for internal use only, i.e copying icav2 subfolders';

/* Heartbeat constants */
export const DEFAULT_HEART_BEAT_INTERVAL = Duration.minutes(5);
export const DEFAULT_HEART_BEAT_EVENT_BRIDGE_RULE = 'HeartBeatEventBridgeRule';

/* Evevnt pipe constants */
export const DEFAULT_EVENT_PIPE_NAME = 'Icav2CopyJobEventPipe';
export const DEFAULT_ICA_SQS_NAME = 'Icav2CopyJobSqsQueue';

export const DEFAULT_ICA_QUEUE_VIZ_TIMEOUT = Duration.seconds(30);
export const DEFAULT_DLQ_ALARM_THRESHOLD = 1;
export const DEFAULT_ICA_AWS_ACCOUNT_NUMBER = '079623148045';
export const ICA_COPY_JOB_EVENT_CODE = 'ICA_JOB_001';

/* UMCCR / CCGCM constants */

/* DynamoDB table constants */
export const TABLE_NAME = 'icav2DataCopyManagerDynamoDBTable';
export const TABLE_REMOVAL_POLICY = RemovalPolicy.DESTROY; // Our table is very transient

/* Event constants */
export const EVENT_BUS_NAME_EXTERNAL = 'OrcaBusMain'; // Listen to the main event bus for external services
export const EVENT_BUS_NAME_INTERNAL = 'OrcaBusICAv2DataCopyInternal'; // Events for internal use only, i.e copying subfolders
export const EVENT_DETAIL_TYPE_EXTERNAL = 'ICAv2DataCopySync';
export const EVENT_SOURCE = 'orcabus.icav2datacopymanager';
export const ICA_EVENT_PIPE_STACK_NAME = 'IcaEventPipeStack';

/*
ICAv2 Resources
These are generated in the Infrastructure stack under
https://github.com/umccr/infrastructure/tree/master/cdk/apps/icav2_credentials
*/
export const icav2AccessTokenSecretId: Record<StageName, string> = {
  ['BETA']: 'ICAv2JWTKey-umccr-prod-service-dev', // pragma: allowlist secret
  ['GAMMA']: 'ICAv2JWTKey-umccr-prod-service-staging', // pragma: allowlist secret
  ['PROD']: 'ICAv2JWTKey-umccr-prod-service-production', // pragma: allowlist secret
};
