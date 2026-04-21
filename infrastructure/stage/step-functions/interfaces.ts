/* Step Function interfaces */
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaName, LambdaObject } from '../lambda/interfaces';
import { EventBridgeNameList } from '../event-rules/interfaces';
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { EcsTaskObject } from '../ecs/interfaces';
import { IQueue } from 'aws-cdk-lib/aws-sqs';

export type SfnName =
  | 'handleCopyJobs'
  | 'saveJobAndInternalTaskToken'
  | 'sendCopyJobsToQueue'
  | 'sendHeartbeatExternal'
  | 'sendHeartbeatInternal'
  | 'sendHeartbeatOfQueueJobs'
  | 'sendInternalTaskToken';

export const sfnNameList: SfnName[] = [
  'handleCopyJobs',
  'saveJobAndInternalTaskToken',
  'sendCopyJobsToQueue',
  'sendHeartbeatExternal',
  'sendHeartbeatInternal',
  'sendHeartbeatOfQueueJobs',
  'sendInternalTaskToken',
];

export interface SfnProps {
  /* Naming formation */
  stateMachineName: SfnName;
}

export interface SfnObject extends SfnProps {
  /* The state machine object */
  stateMachineObj: StateMachine;
}

export const stepFunctionToLambdaMap: { [key in SfnName]: Array<LambdaName> } = {
  handleCopyJobs: [
    'convertSourceUriFolderToUriList',
    'findSinglePartFiles',
    'generateCopyJobList',
    'getExternalSourceFileMetadata',
    'getRenamingMapParams',
    'getSourceFileSize',
    'launchIcav2Copy',
    'renameFile',
    'unlockCallbackId',
    'uploadFromFilemanager',
    'uploadSinglePartFile',
    'validateFileTransfer',
  ],
  saveJobAndInternalTaskToken: [],
  sendCopyJobsToQueue: [],
  sendHeartbeatExternal: [],
  sendHeartbeatInternal: ['checkJobStatus'],
  sendHeartbeatOfQueueJobs: [],
  sendInternalTaskToken: [],
};

export interface SfnRequirementsProps {
  /* ECS Stuff */
  needsEcsPermissions?: boolean;

  /* Does the Step Function need table access bus */
  needsTableObj?: boolean;

  /* Event Bridge Stuff */
  needsSqsQueueHeartBeatRuleObj?: boolean;
  needsInternalHeartBeatRuleObj?: boolean;
  needsExternalHeartBeatRuleObj?: boolean;

  /* Needs task token update permissions */
  needsTaskTokenUpdatePermissions?: boolean;

  /* Check if step function needs distributed map policies */
  needsDistributedMapPolicies?: boolean;

  /* Check if step function needs handle copy jobs list executions */
  needsHandleCopyJobsListExecutions?: boolean;

  /* Check if the step function needs to be an express step function */
  isExpress?: boolean;

  /* Sqs Stuff */
  needsSqsPermissions?: boolean;

  /* Nested Step Function stuff */
  needsNestedStepFunctionStartExecutionPermissions?: boolean;
}

export const SfnRequirementsMapType: { [key in SfnName]: SfnRequirementsProps } = {
  // Handle copy jobs
  handleCopyJobs: {
    /* Event stuff */
    needsExternalHeartBeatRuleObj: true,

    /* ECS Stuff */
    needsEcsPermissions: true,

    /* Task Token permissions */
    needsTaskTokenUpdatePermissions: true,

    /* Nested Step Function permissions */
    needsNestedStepFunctionStartExecutionPermissions: true,
  },
  sendCopyJobsToQueue: {
    /* Table stuff */
    needsTableObj: true,

    /* Rule Stuff */
    needsSqsQueueHeartBeatRuleObj: true,

    /* SQS Send Message Permissions */
    needsSqsPermissions: true,

    /* Express: Yes, quick in-and-out */
    isExpress: true,
  },
  // Save job and internal task token
  saveJobAndInternalTaskToken: {
    /* Table stuff */
    needsTableObj: true,

    /* Event rule stuff */
    needsInternalHeartBeatRuleObj: true,

    /* Express: Yes, quick in-and-out */
    isExpress: true,
  },
  // Send heartbeat internal
  sendHeartbeatInternal: {
    /* Table stuff */
    needsTableObj: true,

    /* Rule Stuff */
    needsInternalHeartBeatRuleObj: true,

    /* Needs task token update permissions */
    needsTaskTokenUpdatePermissions: true,

    /* Needs distributed map policies */
    needsDistributedMapPolicies: true,
  },
  // Send heartbeat external
  sendHeartbeatExternal: {
    /* Rule Stuff */
    needsExternalHeartBeatRuleObj: true,

    /* Needs task token update permissions */
    needsTaskTokenUpdatePermissions: true,

    /* Needs distributed map policies */
    needsDistributedMapPolicies: true,

    /* Needs handle copy jobs list executions */
    needsHandleCopyJobsListExecutions: true,
  },
  sendHeartbeatOfQueueJobs: {
    /* Table Stuff */
    needsTableObj: true,

    /* Rule Stuff */
    needsSqsQueueHeartBeatRuleObj: true,

    /* Needs task token update permissions */
    needsTaskTokenUpdatePermissions: true,

    /* Needs distributed map policies */
    needsDistributedMapPolicies: true,
  },
  // Send internal task token
  sendInternalTaskToken: {
    /* Table stuff */
    needsTableObj: true,

    /* Task token permissions */
    needsTaskTokenUpdatePermissions: true,

    /* This comes from an sqs queue so it needs to be an internal sfn */
    isExpress: true,
  },
};

export type internalHeartBeatRuleNameList = Extract<
  EventBridgeNameList,
  'internalHeartBeatScheduleRule'
>;
export type externalHeartBeatRuleNameList = Extract<
  EventBridgeNameList,
  'externalHeartBeatScheduleRule'
>;
export type sqsHeartBeatRuleNameList = Extract<EventBridgeNameList, 'sqsQueueScheduleRule'>;

export interface BuildSfnProps extends SfnProps {
  /* Lambdas */
  lambdaFunctions: LambdaObject[];

  /* ECS Stuff */
  ecsFargateTaskObjects: EcsTaskObject[];

  /* Table stuff */
  tableObj?: ITableV2;

  /* Event Bridge Stuff */
  sqsHeartBeatRuleName?: sqsHeartBeatRuleNameList;
  internalHeartBeatRuleName?: internalHeartBeatRuleNameList;
  externalHeartBeatRuleName?: externalHeartBeatRuleNameList;

  /* Sqs Queue Objects */
  copySqsQueue: IQueue;
}

export type BuildSfnsProps = Omit<BuildSfnProps, 'stateMachineName'>;

export interface WirePermissionsProps extends BuildSfnProps {
  stateMachineObj: StateMachine;
}
