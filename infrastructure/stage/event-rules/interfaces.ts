/* Event Bridge interfaces */
import { IEventBus, Rule } from 'aws-cdk-lib/aws-events';
import { Duration } from 'aws-cdk-lib';

export type EventBridgeNameList =
  /* Listen to copy jobs on the internal event bus */
  | 'listenInternalCopyJobRule'
  /* Save the job and internal task token */
  | 'listenInternalTaskTokenRule'
  /* Listen to copy jobs on the external event bus */
  | 'listenExternalCopyJobRule'
  | 'listenExternalCopyJobLegacyRule'
  /* Schedule rule to send heartbeats */
  | 'internalHeartBeatScheduleRule'
  | 'externalHeartBeatScheduleRule';

export const eventBridgeNameList: Array<EventBridgeNameList> = [
  'listenInternalCopyJobRule',
  'listenInternalTaskTokenRule',
  'listenExternalCopyJobRule',
  'listenExternalCopyJobLegacyRule',
  'internalHeartBeatScheduleRule',
  'externalHeartBeatScheduleRule',
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
