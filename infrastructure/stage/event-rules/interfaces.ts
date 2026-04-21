/* Event Bridge interfaces */
import { IEventBus, Rule } from 'aws-cdk-lib/aws-events';
import { Duration } from 'aws-cdk-lib';

export type EventBridgeNameList =
  /* Listen to copy jobs on the external event bus */
  | 'listenExternalCopyJobRule'
  /* Schedule rule to send heartbeats */
  | 'sqsQueueScheduleRule'
  | 'internalHeartBeatScheduleRule'
  | 'externalHeartBeatScheduleRule';

export const eventBridgeNameList: Array<EventBridgeNameList> = [
  /* Listen to copy jobs on the external event bus */
  'listenExternalCopyJobRule',
  /* Schedule rule to send heartbeats */
  'sqsQueueScheduleRule',
  'internalHeartBeatScheduleRule',
  'externalHeartBeatScheduleRule',
];

export interface EventBridgeRuleProps {
  ruleName: EventBridgeNameList;
  eventBus: IEventBus;
}

export interface ExternalEventBridgeRuleProps extends EventBridgeRuleProps {
  eventDetailType: string;
}

export interface HeartBeatEventBridgeRuleProps extends Omit<EventBridgeRuleProps, 'eventBus'> {
  scheduleDuration?: Duration;
}

export interface EventBridgeRulesProps {
  externalEventBus: IEventBus;
  eventSource: string;
  eventDetailType: string;
}

export interface EventBridgeRuleObject {
  ruleName: EventBridgeNameList;
  ruleObject: Rule;
}
