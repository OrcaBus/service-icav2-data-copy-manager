import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Rule } from 'aws-cdk-lib/aws-events';
import { EventBridgeRuleObject } from '../event-rules/interfaces';
import { SfnObject } from '../step-functions/interfaces';

export interface AddSfnAsEventBridgeTargetProps {
  stateMachineObj: StateMachine;
  eventBridgeRuleObj: Rule;
}

export type EventBridgeTargetsNameList =
  | 'externalCopyJobRuleToSendCopyJobsSfn'
  | 'sqsHeartBeatScheduleRuleToSendHeartBeatSfn'
  | 'internalHeartBeatScheduleRuleToSendHeartBeatSfn'
  | 'externalHeartBeatScheduleRuleToSendHeartBeatSfn';

export interface EventBridgeTargetsProps {
  eventBridgeRuleObjects: EventBridgeRuleObject[];
  stepFunctionObjects: SfnObject[];
}

export const eventBridgeTargetsNameList: Array<EventBridgeTargetsNameList> = [
  'externalCopyJobRuleToSendCopyJobsSfn',
  'sqsHeartBeatScheduleRuleToSendHeartBeatSfn',
  'internalHeartBeatScheduleRuleToSendHeartBeatSfn',
  'externalHeartBeatScheduleRuleToSendHeartBeatSfn',
];
