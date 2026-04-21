import { Duration } from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SfnName } from '../step-functions/interfaces';
import { Topic } from 'aws-cdk-lib/aws-sns';

export interface SqsQueueConstructProps {
  /* The name for the incoming SQS queue (the DLQ with use this name with a "-dlq" postfix) */
  queueName: string;
  /* The visibility timeout for the queue */
  queueVizTimeout: Duration;
  /* The ARN of the SNS Topic to receive DLQ notifications from CloudWatch */
  slackTopic: Topic;
  /* The CloudWatch Alarm threshold to use before raising an alarm */
  dlqMessageThreshold: number;
  /* For long polling */
  receiveMessageWaitTime?: Duration;
}

export interface IcaSqsQueueConstructProps {
  /* The name for the incoming SQS queue (the DLQ with use this name with a "-dlq" postfix) */
  icaQueueName: string;
  /* The visibility timeout for the queue */
  icaQueueVizTimeout: Duration;
  /* The ARN of the SNS Topic to receive DLQ notifications from CloudWatch */
  slackTopic: Topic;
  /* The CloudWatch Alarm threshold to use before raising an alarm */
  dlqMessageThreshold: number;
  /* The ICA account to grant publish permissions to */
  icaAwsAccountNumber: string;
}

export interface IcaEventPipeConstructProps {
  /* The Sqs object */
  icaSqsQueue: Queue;
  /* The name for the Event Pipe */
  icaEventPipeName: string;
  /* Step Function we forward events to */
  stepFunctionName: SfnName;
}

export type IcaSqsEventPipeProps = Omit<IcaEventPipeConstructProps, 'icaSqsQueue'> &
  IcaSqsQueueConstructProps;
