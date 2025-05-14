import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { IEventBus, Rule } from 'aws-cdk-lib/aws-events';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';

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
export interface IcaSqsQueueConstructProps {
  /* The name for the incoming SQS queue (the DLQ with use this name with a "-dlq" postfix) */
  icaQueueName: string;
  /* The visibility timeout for the queue */
  icaQueueVizTimeout: Duration;
  /* The ARN of the SNS Topic to receive DLQ notifications from CloudWatch */
  slackTopicArn: string;
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
  /* The Event Bus to forward events to (used to lookup the Event Bus) */
  eventBusObj: IEventBus;
}

export type IcaSqsEventPipeProps = Omit<IcaEventPipeConstructProps, 'icaSqsQueue'> &
  IcaSqsQueueConstructProps;

/** Stateless interfaces **/

/* We also throw in our custom application interfaces here too */
export interface lambdaRequirementProps {
  needsIcav2AccessToken: boolean;
}

/* Lambda interfaces */
export type LambdaNameList =
  | 'findSinglePartFiles'
  | 'generateCopyJobList'
  | 'launchIcav2Copy'
  | 'uploadSinglePartFile'
  | 'checkJobStatus';

/* Lambda names array */
/* Bit of double handling, BUT types are not parsed to JS */
export const lambdaNameList: Array<LambdaNameList> = [
  'findSinglePartFiles',
  'generateCopyJobList',
  'launchIcav2Copy',
  'uploadSinglePartFile',
  'checkJobStatus',
];

export type LambdaToRequirementsMapType = { [key in LambdaNameList]: lambdaRequirementProps };

export const lambdaToRequirementsMap: LambdaToRequirementsMapType = {
  findSinglePartFiles: {
    needsIcav2AccessToken: true,
  },
  generateCopyJobList: {
    needsIcav2AccessToken: true,
  },
  launchIcav2Copy: {
    needsIcav2AccessToken: true,
  },
  uploadSinglePartFile: {
    needsIcav2AccessToken: true,
  },
  checkJobStatus: {
    needsIcav2AccessToken: true,
  },
};

export interface BuildLambdaProps {
  lambdaName: LambdaNameList;
  icav2AccessTokenSecretObj: ISecret;
}

export interface BuildLambdasProps {
  icav2AccessTokenSecretObj: ISecret;
}

export interface LambdaObject extends Omit<BuildLambdaProps, 'icav2AccessTokenSecretObj'> {
  lambdaFunction: PythonFunction;
}

/* Event Bridge interfaces */
export type EventBridgeNameList =
  /* Listen to copy jobs on the internal event bus */
  | 'listenInternalCopyJobRule'
  /* Save the job and internal task token */
  | 'listenInternalTaskTokenRule'
  /* Listen to copy jobs on the external event bus */
  | 'listenExternalCopyJobRule'
  /* Listen to ICAv2 events from the event pipe */
  | 'listenICAv2CopyJobEventPipeRule'
  /* Schedule rule to send heartbeats */
  | 'heartBeatScheduleRule';

export const eventBridgeNameList: Array<EventBridgeNameList> = [
  'listenInternalCopyJobRule',
  'listenInternalTaskTokenRule',
  'listenExternalCopyJobRule',
  'listenICAv2CopyJobEventPipeRule',
  'heartBeatScheduleRule',
];

export interface EventBridgeRuleProps {
  ruleName: EventBridgeNameList;
  eventBus: IEventBus;
}

export interface InternalEventBridgeRuleProps extends EventBridgeRuleProps {
  eventDetailType: string;
  eventSource: string;
}

export interface ExternalEventBridgeRuleProps extends EventBridgeRuleProps {
  eventDetailType: string;
}

export interface HeartBeatEventBridgeRuleProps extends Omit<EventBridgeRuleProps, 'eventBus'> {
  scheduleDuration?: Duration;
}

export interface EventBridgeRulesProps {
  internalEventBus: IEventBus;
  externalEventBus: IEventBus;
  eventSource: string;
  eventDetailType: string;
}

export interface EventBridgeRuleObject {
  ruleName: EventBridgeNameList;
  ruleObject: Rule;
}

/* Step Function interfaces */
export type SfnNameList =
  | 'handleCopyJobs'
  | 'saveJobAndInternalTaskToken'
  | 'sendInternalTaskToken'
  | 'sendHeartbeat';

export interface SfnProps {
  /* Naming formation */
  stateMachineName: SfnNameList;
}

export interface SfnObject extends SfnProps {
  /* The state machine object */
  stateMachineObj: StateMachine;
}

export const HandleCopyJobsLambdaList: Array<LambdaNameList> = [
  'generateCopyJobList',
  'launchIcav2Copy',
  'uploadSinglePartFile',
  'findSinglePartFiles',
];

export const SendHeartbeatJobsLambdaList: Array<LambdaNameList> = ['checkJobStatus'];

export const sfnNameList: Array<SfnNameList> = [
  'handleCopyJobs',
  'saveJobAndInternalTaskToken',
  'sendInternalTaskToken',
  'sendHeartbeat',
];

export interface SfnRequirementsProps {
  /* Lambdas */
  requiredLambdaNameList?: LambdaNameList[];

  /* Event stuff */
  needsInternalEventBus?: boolean;
  needsIcav2CopyServiceEventSource?: boolean;
  needsIcav2CopyServiceDetailType?: boolean;

  /* Does the Step Function need table access bus */
  needsTableObj?: boolean;

  /* Event Bridge Stuff */
  needsHeartBeatRuleObj?: boolean;

  /* Needs task token update permissions */
  needsTaskTokenUpdatePermissions?: boolean;

  /* Check if step function needs distributed map policies */
  needsDistributedMapPolicies?: boolean;
}

export const SfnRequirementsMapType: { [key in SfnNameList]: SfnRequirementsProps } = {
  // Handle copy jobs
  handleCopyJobs: {
    /* Lambdas */
    requiredLambdaNameList: HandleCopyJobsLambdaList,

    /* Event stuff */
    needsInternalEventBus: true,
    needsIcav2CopyServiceEventSource: true,
    needsIcav2CopyServiceDetailType: true,

    /* Task Token permissions */
    needsTaskTokenUpdatePermissions: true,
  },
  // Save job and internal task token
  saveJobAndInternalTaskToken: {
    /* Table stuff */
    needsTableObj: true,

    /* Event rule stuff */
    needsHeartBeatRuleObj: true,
  },
  // Send internal task token
  sendInternalTaskToken: {
    /* Table stuff */
    needsTableObj: true,

    /* Task token permissions */
    needsTaskTokenUpdatePermissions: true,
  },
  // Send heartbeat
  sendHeartbeat: {
    /* Lambda name list */
    requiredLambdaNameList: SendHeartbeatJobsLambdaList,

    /* Table stuff */
    needsTableObj: true,

    /* Event Stuff */
    needsHeartBeatRuleObj: true,

    /* Needs task token update permissions */
    needsTaskTokenUpdatePermissions: true,

    /* Needs distributed map policies */
    needsDistributedMapPolicies: true,
  },
};

export type heartBeatRuleNameList = Extract<EventBridgeNameList, 'heartBeatScheduleRule'>;

export interface BuildSfnProps extends SfnProps {
  /* Lambdas */
  lambdas?: LambdaObject[];

  /* Event Stuff */
  internalEventBus?: IEventBus;
  icav2CopyServiceEventSource?: string;
  icav2CopyServiceDetailType?: string;

  /* Table stuff */
  tableObj?: ITableV2;

  /* Event Bridge Stuff */
  heartBeatRuleName?: heartBeatRuleNameList;
}

export interface BuildSfnsProps {
  /* Lambdas */
  lambdas?: LambdaObject[];

  /* Event Stuff */
  internalEventBus?: IEventBus;
  icav2CopyServiceEventSource?: string;
  icav2CopyServiceDetailType?: string;

  /* Table stuff */
  tableObj?: ITableV2;

  /* Event Bridge Stuff */
  heartBeatRuleName?: heartBeatRuleNameList;
}

export interface WirePermissionsProps extends BuildSfnProps {
  stateMachineObj: StateMachine;
}

export interface AddSfnAsEventBridgeTargetProps {
  stateMachineObj: StateMachine;
  eventBridgeRuleObj: Rule;
}

export type EventBridgeTargetsNameList =
  | 'internalCopyJobRuleToHandleCopyJobsSfn'
  | 'internalTaskTokenRuleToSaveJobAndInternalTaskTokenSfn'
  | 'externalCopyJobRuleToHandleCopyJobsSfn'
  | 'iCAv2CopyJobEventPipeToSendInternalTaskTokenSfn'
  | 'heartBeatScheduleRuleToSendHeartbeatSfn';

export interface EventBridgeTargetsProps {
  eventBridgeRuleObjects: EventBridgeRuleObject[];
  stepFunctionObjects: SfnObject[];
}

export const eventBridgeTargetsNameList: Array<EventBridgeTargetsNameList> = [
  'internalCopyJobRuleToHandleCopyJobsSfn',
  'internalTaskTokenRuleToSaveJobAndInternalTaskTokenSfn',
  'externalCopyJobRuleToHandleCopyJobsSfn',
  'iCAv2CopyJobEventPipeToSendInternalTaskTokenSfn',
  'heartBeatScheduleRuleToSendHeartbeatSfn',
];
