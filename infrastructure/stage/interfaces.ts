import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';

/** Application Interfaces **/

/** Stateful interfaces **/
export interface StatefulApplicationStackConfig extends cdk.StackProps {
  /* Dynamodb */
  tableName: string;
  tableRemovalPolicy: RemovalPolicy;

  /* Sqs Stuff */
  copyJobSqsQueueName: string;

  /* Notification stuff */
  slackTopicName: string;
}

/** Stateless interfaces **/
export interface StatelessApplicationStackConfig extends cdk.StackProps {
  /* Stage Name */
  stageName: StageName;
  /* Dynamodb table name */
  tableName: string;

  /* ICAv2 access token secret name */
  icav2AccessTokenSecretId: string;
  orcabusTokenSecretId: string;
  hostnameSsmParameterName: string;

  /* Event stuff */
  externalEventBusName: string;
  eventDetailType: string;
  eventSource: string;

  /* Sqs Stuff */
  copyJobQueueName: string;

  /* Additional event stuff */
  icaEventPipeName: string;
}
