import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Rule } from 'aws-cdk-lib/aws-events';
import { EventBridgeRuleObject } from '../event-rules/interfaces';
import { SfnObject } from '../step-functions/interfaces';

export interface AddSfnAsEventBridgeTargetProps {
  stateMachineObj: StateMachine;
  eventBridgeRuleObj: Rule;
}

export type EventBridgeTargetsNameList =
  | 'internalCopyJobRuleToHandleCopyJobsSfn'
  | 'internalTaskTokenRuleToSaveJobAndInternalTaskTokenSfn'
  | 'externalCopyJobRuleToHandleCopyJobsSfn'
  | 'externalCopyJobLegacyRuleToHandleCopyJobsSfn'
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
  'externalCopyJobLegacyRuleToHandleCopyJobsSfn',
  'iCAv2CopyJobEventPipeToSendInternalTaskTokenSfn',
  'heartBeatScheduleRuleToSendHeartbeatSfn',
];
