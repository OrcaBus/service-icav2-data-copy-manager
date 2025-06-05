// Standard cdk imports
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

// Local imports
import { StatefulApplicationStackConfig } from './interfaces';

import {
  DEFAULT_DLQ_ALARM_THRESHOLD,
  DEFAULT_EVENT_PIPE_NAME,
  DEFAULT_ICA_AWS_ACCOUNT_NUMBER,
  DEFAULT_ICA_QUEUE_VIZ_TIMEOUT,
  DEFAULT_ICA_SQS_NAME,
} from './constants';
import { createEventBridgePipe, getTopicArnFromTopicName } from './sqs';
import { buildTable } from './dynamodb';
import { buildEventBus } from './event-bus';

export type StatefulApplicationStackProps = StatefulApplicationStackConfig & cdk.StackProps;

// Stateful Application Stack
export class StatefulApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StatefulApplicationStackProps) {
    super(scope, id, props);

    /* DynamoDB Table */
    buildTable(this, {
      tableName: props.tableName,
      tableRemovalPolicy: props.tableRemovalPolicy,
    });

    /* Event bus */
    const internalEventBusObject = buildEventBus(this, {
      eventBusName: props.internalEventBusName,
      eventBusDescription: props.internalEventBusDescription,
    });

    // Create the event pipe to join the ICA SQS queue to the event bus
    createEventBridgePipe(this, {
      icaEventPipeName: DEFAULT_EVENT_PIPE_NAME,
      eventBusObj: internalEventBusObject,
      icaQueueName: DEFAULT_ICA_SQS_NAME,
      icaQueueVizTimeout: DEFAULT_ICA_QUEUE_VIZ_TIMEOUT,
      slackTopicArn: getTopicArnFromTopicName(props.slackTopicName),
      dlqMessageThreshold: DEFAULT_DLQ_ALARM_THRESHOLD,
      icaAwsAccountNumber: DEFAULT_ICA_AWS_ACCOUNT_NUMBER,
    });
  }
}
