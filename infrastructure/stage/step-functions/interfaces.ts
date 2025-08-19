/* Step Function interfaces */
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaNameList, LambdaObject } from '../lambda/interfaces';
import { EventBridgeNameList } from '../event-rules/interfaces';
import { IEventBus } from 'aws-cdk-lib/aws-events';
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { EcsFargateTaskConstruct } from '@orcabus/platform-cdk-constructs/ecs';

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
  'findSinglePartFiles',
  'convertSourceUriFolderToUriList',
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

  /* ECS Stuff */
  needsEcsPermissions?: boolean;

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

  /* ECS Stuff */
  uploadSinglePartFileEcsFargateObject: EcsFargateTaskConstruct;

  /* Table stuff */
  tableObj?: ITableV2;

  /* Event Bridge Stuff */
  heartBeatRuleName?: heartBeatRuleNameList;
}

export type BuildSfnsProps = Omit<BuildSfnProps, 'stateMachineName'>;

export interface WirePermissionsProps extends BuildSfnProps {
  stateMachineObj: StateMachine;
}
