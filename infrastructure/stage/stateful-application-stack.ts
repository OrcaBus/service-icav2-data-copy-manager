// Standard cdk imports
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

// Local imports
import { StatefulApplicationStackConfig } from './interfaces';

import {
  DEFAULT_COPY_JOB_QUEUE_TIMEOUT,
  DEFAULT_DLQ_ALARM_THRESHOLD,
  DEFAULT_EVENT_PIPE_NAME,
  DEFAULT_ICA_AWS_ACCOUNT_NUMBER,
  DEFAULT_ICA_QUEUE_VIZ_TIMEOUT,
  DEFAULT_ICA_SQS_NAME,
} from './constants';
import { createEventBridgePipe, createMonitoredQueue, getTopicArnFromTopicName } from './sqs';
import { buildTable } from './dynamodb';
import { buildSchemas } from './event-schemas';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Duration } from 'aws-cdk-lib';
import { GitStack } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';

export type StatefulApplicationStackProps = StatefulApplicationStackConfig & cdk.StackProps;

// Stateful Application Stack
export class StatefulApplicationStack extends GitStack {
  constructor(scope: Construct, id: string, props: StatefulApplicationStackProps) {
    super(scope, id, props);

    /* DynamoDB Table */
    buildTable(this, {
      tableName: props.tableName,
      tableRemovalPolicy: props.tableRemovalPolicy,
    });

    // Get the slack topic, used for both queues
    const slackTopic: Topic = Topic.fromTopicArn(
      this,
      'SlackTopic',
      getTopicArnFromTopicName(props.slackTopicName)
    ) as Topic;

    /* Build the Handle Copy Job Queue */
    // Buffer to launch ICA analysis requests
    createMonitoredQueue(this, {
      dlqMessageThreshold: 1,
      queueName: props.copyJobSqsQueueName,
      queueVizTimeout: DEFAULT_COPY_JOB_QUEUE_TIMEOUT,
      slackTopic: slackTopic,
      receiveMessageWaitTime: Duration.seconds(20),
    });

    /* Build the ICA Monitored Queue */
    createEventBridgePipe(this, {
      stepFunctionName: 'sendInternalTaskToken',
      icaEventPipeName: DEFAULT_EVENT_PIPE_NAME,
      icaQueueName: DEFAULT_ICA_SQS_NAME,
      icaQueueVizTimeout: DEFAULT_ICA_QUEUE_VIZ_TIMEOUT,
      slackTopic: slackTopic,
      dlqMessageThreshold: DEFAULT_DLQ_ALARM_THRESHOLD,
      icaAwsAccountNumber: DEFAULT_ICA_AWS_ACCOUNT_NUMBER,
    });

    // Build the schemas
    buildSchemas(this);
  }
}
