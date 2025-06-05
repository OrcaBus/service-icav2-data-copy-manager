import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';

/** Application Interfaces **/

export interface StatefulApplicationStackConfig extends cdk.StackProps {
  /* Dynamodb */
  tableName: string;
  tableRemovalPolicy: RemovalPolicy;

  /* Event stuff */
  internalEventBusName: string;
  internalEventBusDescription: string;

  /* Notification stuff */
  slackTopicName: string;
}

export interface StatelessApplicationStackConfig extends cdk.StackProps {
  /* Stage Name */
  stageName: StageName;
  /* Dynamodb table name */
  tableName: string;

  /* ICAv2 access token secret name */
  icav2AccessTokenSecretId: string;

  /* Event stuff */
  externalEventBusName: string;
  internalEventBusName: string;
  eventDetailType: string;
  eventSource: string;

  /* Additional event stuff */
  icaEventPipeName: string;
}

/** Stateful interfaces **/

/** Stateless interfaces **/
