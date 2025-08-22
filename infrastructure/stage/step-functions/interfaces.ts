/* Step Function interfaces */
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaName, LambdaObject } from '../lambda/interfaces';
import { EventBridgeNameList } from '../event-rules/interfaces';
import { IEventBus } from 'aws-cdk-lib/aws-events';
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { EcsFargateTaskConstruct } from '@orcabus/platform-cdk-constructs/ecs';

export type SfnName =
  | 'handleCopyJobs'
  | 'saveJobAndInternalTaskToken'
  | 'sendInternalTaskToken'
  | 'sendHeartbeatInternal'
  | 'sendHeartbeatExternal';

export const sfnNameList: SfnName[] = [
  'handleCopyJobs',
  'saveJobAndInternalTaskToken',
  'sendInternalTaskToken',
  'sendHeartbeatInternal',
  'sendHeartbeatExternal',
];

export interface SfnProps {
  /* Naming formation */
  stateMachineName: SfnName;
}

export interface SfnObject extends SfnProps {
  /* The state machine object */
  stateMachineObj: StateMachine;
}

export const HandleCopyJobsLambdaList: LambdaName[] = [
  'generateCopyJobList',
  'launchIcav2Copy',
  'findSinglePartFiles',
  'convertSourceUriFolderToUriList',
  'uploadSinglePartFile',
  'getSourceFileSize',
];

export const SendHeartbeatInternalJobsLambdaList: LambdaName[] = ['checkJobStatus'];

export interface SfnRequirementsProps {
  /* Lambdas */
  requiredLambdaNameList?: LambdaName[];

  /* Event stuff */
  needsInternalEventBus?: boolean;
  needsIcav2CopyServiceEventSource?: boolean;
  needsIcav2CopyServiceDetailType?: boolean;

  /* ECS Stuff */
  needsEcsPermissions?: boolean;

  /* Does the Step Function need table access bus */
  needsTableObj?: boolean;

  /* Event Bridge Stuff */
  needsInternalHeartBeatRuleObj?: boolean;
  needsExternalHeartBeatRuleObj?: boolean;

  /* Needs task token update permissions */
  needsTaskTokenUpdatePermissions?: boolean;

  /* Check if step function needs distributed map policies */
  needsDistributedMapPolicies?: boolean;

  /* Check if step function needs handle copy jobs list executions */
  needsHandleCopyJobsListExecutions?: boolean;
}

export const SfnRequirementsMapType: { [key in SfnName]: SfnRequirementsProps } = {
  // Handle copy jobs
  handleCopyJobs: {
    /* Lambdas */
    requiredLambdaNameList: HandleCopyJobsLambdaList,

    /* Event stuff */
    needsInternalEventBus: true,
    needsIcav2CopyServiceEventSource: true,
    needsIcav2CopyServiceDetailType: true,
    needsExternalHeartBeatRuleObj: true,

    /* ECS Stuff */
    needsEcsPermissions: true,

    /* Task Token permissions */
    needsTaskTokenUpdatePermissions: true,
  },
  // Save job and internal task token
  saveJobAndInternalTaskToken: {
    /* Table stuff */
    needsTableObj: true,

    /* Event rule stuff */
    needsInternalHeartBeatRuleObj: true,
  },
  // Send internal task token
  sendInternalTaskToken: {
    /* Table stuff */
    needsTableObj: true,

    /* Task token permissions */
    needsTaskTokenUpdatePermissions: true,
  },
  // Send heartbeat internal
  sendHeartbeatInternal: {
    /* Lambda name list */
    requiredLambdaNameList: SendHeartbeatInternalJobsLambdaList,

    /* Table stuff */
    needsTableObj: true,

    /* Event Stuff */
    needsInternalHeartBeatRuleObj: true,

    /* Needs task token update permissions */
    needsTaskTokenUpdatePermissions: true,

    /* Needs distributed map policies */
    needsDistributedMapPolicies: true,
  },
  // Send heartbeat external
  sendHeartbeatExternal: {
    /* Event Stuff */
    needsExternalHeartBeatRuleObj: true,

    /* Needs task token update permissions */
    needsTaskTokenUpdatePermissions: true,

    /* Needs distributed map policies */
    needsDistributedMapPolicies: true,

    /* Needs handle copy jobs list executions */
    needsHandleCopyJobsListExecutions: true,
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

export interface BuildSfnProps extends SfnProps {
  /* Lambdas */
  lambdas?: LambdaObject[];

  /* Event Stuff */
  internalEventBus?: IEventBus;
  icav2CopyServiceEventSource?: string;
  icav2CopyServiceDetailType?: string;

  /* ECS Stuff */
  uploadSinglePartFileEcsFargateObject: EcsFargateTaskConstruct;

  /* Table stuff */
  tableObj?: ITableV2;

  /* Event Bridge Stuff */
  internalHeartBeatRuleName?: internalHeartBeatRuleNameList;
  externalHeartBeatRuleName?: externalHeartBeatRuleNameList;

  /* Other sfns */
  handleCopyJobsSfnObject?: SfnObject;
}

export type BuildSfnsProps = Omit<BuildSfnProps, 'stateMachineName'>;

export interface WirePermissionsProps extends BuildSfnProps {
  stateMachineObj: StateMachine;
}
