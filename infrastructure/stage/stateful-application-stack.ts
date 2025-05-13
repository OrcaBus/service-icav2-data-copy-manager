// Standard cdk imports
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';

// Application imports
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as pipes from '@aws-cdk/aws-pipes-alpha';

// Local imports
import {
  IcaEventPipeConstructProps,
  IcaSqsEventPipeProps,
  IcaSqsQueueConstructProps,
  StatefulApplicationStackConfig,
} from './interfaces';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { MonitoredQueue } from 'sqs-dlq-monitoring';
import { SqsSource } from '@aws-cdk/aws-pipes-sources-alpha';
import {
  DEFAULT_DLQ_ALARM_THRESHOLD,
  DEFAULT_EVENT_PIPE_NAME,
  DEFAULT_ICA_AWS_ACCOUNT_NUMBER,
  DEFAULT_ICA_QUEUE_VIZ_TIMEOUT,
  DEFAULT_ICA_SQS_NAME,
} from './constants';
import { IEventBus } from 'aws-cdk-lib/aws-events';

export type StatefulApplicationStackProps = StatefulApplicationStackConfig & cdk.StackProps;

// Stateful Application Stack
export class StatefulApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StatefulApplicationStackProps) {
    super(scope, id, props);

    /* Dynamodb table */
    new dynamodb.TableV2(this, props.tableName, {
      /* Either a db_uuid or an icav2 analysis id or a portal run id */
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      /* One of 'job_type', 'task_token' */
      sortKey: {
        name: 'id_type',
        type: dynamodb.AttributeType.STRING,
      },
      tableName: props.tableName,
      removalPolicy: props.tableRemovalPolicy || RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      timeToLiveAttribute: 'expire_at',
    });

    /* Event bus */
    const internalEventBusObject = new events.EventBus(this, props.internalEventBusName, {
      eventBusName: props.internalEventBusName,
      description: props.internalEventBusDescription,
    });

    // Create the event pipe to join the ICA SQS queue to the event bus
    this.createEventBridgePipe({
      icaEventPipeName: DEFAULT_EVENT_PIPE_NAME,
      eventBusObj: internalEventBusObject,
      icaQueueName: DEFAULT_ICA_SQS_NAME,
      icaQueueVizTimeout: DEFAULT_ICA_QUEUE_VIZ_TIMEOUT,
      slackTopicArn: this.getTopicArnFromTopicName(props.slackTopicName),
      dlqMessageThreshold: DEFAULT_DLQ_ALARM_THRESHOLD,
      icaAwsAccountNumber: DEFAULT_ICA_AWS_ACCOUNT_NUMBER,
    });
  }

  // Get the topic ARN from the topic name
  private getTopicArnFromTopicName(topicName: string): string {
    return `arn:aws:sns:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${topicName}`;
  }

  // Create the INPUT SQS queue that will receive the ICA events
  // This should have a DLQ and be monitored via CloudWatch alarm and Slack notifications
  private createMonitoredQueue(props: IcaSqsQueueConstructProps): Queue {
    // Note: the construct MonitoredQueue demands a "Topic" construct as it usually modifies the topic adding subscriptions.
    // However, our use case, as we don't add any additional subscriptions, does not require topic modification, so we can pass on an "ITopic" as "Topic".
    const topic: Topic = Topic.fromTopicArn(this, 'SlackTopic', props.slackTopicArn) as Topic;

    const mq = new MonitoredQueue(this, props.icaQueueName, {
      queueProps: {
        queueName: props.icaQueueName,
        enforceSSL: true,
        visibilityTimeout: props.icaQueueVizTimeout,
      },
      dlqProps: {
        queueName: props.icaQueueName + '-dlq',
        enforceSSL: true,
        visibilityTimeout: props.icaQueueVizTimeout,
      },
      messageThreshold: props.dlqMessageThreshold,
      topic: topic,
    });
    mq.queue.grantSendMessages(new iam.AccountPrincipal(props.icaAwsAccountNumber));

    return mq.queue;
  }

  private createEventPipe(props: IcaEventPipeConstructProps) {
    const targetInputTransformation = pipes.InputTransformation.fromObject({
      'ica-event': pipes.DynamicInput.fromEventPath('$.body'),
    });

    return new pipes.Pipe(this, props.icaEventPipeName, {
      source: new SqsSource(props.icaSqsQueue),
      target: new EventBusTarget(props.eventBusObj, {
        inputTransformation: targetInputTransformation,
      }),
    });
  }

  private createEventBridgePipe(props: IcaSqsEventPipeProps) {
    /* Part 1 - Create the monitored queue */
    const monitoredQueue = this.createMonitoredQueue({
      icaQueueName: props.icaQueueName,
      slackTopicArn: props.slackTopicArn,
      icaAwsAccountNumber: props.icaAwsAccountNumber,
      icaQueueVizTimeout: props.icaQueueVizTimeout,
      dlqMessageThreshold: props.dlqMessageThreshold,
    });

    /* Part 2 - Create the event pipe */
    this.createEventPipe({
      icaEventPipeName: props.icaEventPipeName,
      icaSqsQueue: monitoredQueue,
      eventBusObj: props.eventBusObj,
    });
  }
}

// Creates a pipe TARGET wrapping an EventBus
class EventBusTarget implements pipes.ITarget {
  // No official EventBusTarget implementations exist (yet). This is following recommendations from:
  // https://constructs.dev/packages/@aws-cdk/aws-pipes-alpha/v/2.133.0-alpha.0?lang=typescript#example-target-implementation
  targetArn: string;
  private inputTransformation: pipes.IInputTransformation | undefined;

  constructor(
    private readonly eventBus: IEventBus,
    props: { inputTransformation?: pipes.IInputTransformation } = {}
  ) {
    this.eventBus = eventBus;
    this.targetArn = eventBus.eventBusArn;
    this.inputTransformation = props?.inputTransformation;
  }

  bind(_pipe: pipes.Pipe): pipes.TargetConfig {
    return {
      targetParameters: {
        inputTemplate: this.inputTransformation?.bind(_pipe).inputTemplate,
      },
    };
  }

  grantPush(pipeRole: iam.IRole): void {
    this.eventBus.grantPutEventsTo(pipeRole);
  }
}
