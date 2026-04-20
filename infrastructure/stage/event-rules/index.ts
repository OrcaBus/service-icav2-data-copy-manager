import {
  eventBridgeNameList,
  EventBridgeRuleObject,
  EventBridgeRulesProps,
  ExternalEventBridgeRuleProps,
  HeartBeatEventBridgeRuleProps,
} from './interfaces';
import { Rule } from 'aws-cdk-lib/aws-events';
import * as events from 'aws-cdk-lib/aws-events';
import { DEFAULT_HEART_BEAT_INTERVAL } from '../constants';
import { Construct } from 'constructs';

/* Event bridge rules */
function buildHeartBeatEventBridgeRule(
  scope: Construct,
  props: HeartBeatEventBridgeRuleProps
): Rule {
  return new events.Rule(scope, props.ruleName, {
    ruleName: props.ruleName,
    schedule: events.Schedule.rate(props.scheduleDuration ?? DEFAULT_HEART_BEAT_INTERVAL),
  });
}

function buildExternalCopyJobRule(scope: Construct, props: ExternalEventBridgeRuleProps): Rule {
  return new events.Rule(scope, props.ruleName, {
    ruleName: props.ruleName,
    eventPattern: {
      detailType: [props.eventDetailType],
      detail: {
        payload: {
          destinationUri: [{ exists: true }],
        },
      },
    },
    eventBus: props.eventBus,
  });
}

export function buildEventBridgeRules(
  scope: Construct,
  props: EventBridgeRulesProps
): EventBridgeRuleObject[] {
  const eventBridgeObjects: EventBridgeRuleObject[] = [];
  for (const eventBridgeName of eventBridgeNameList) {
    switch (eventBridgeName) {
      /* Listen to copy jobs on the external event bus */
      case 'listenExternalCopyJobRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: buildExternalCopyJobRule(scope, {
            ruleName: eventBridgeName,
            eventBus: props.externalEventBus,
            eventDetailType: props.eventDetailType,
          }),
        });
        break;
      }
      /* Schedule rule to send heartbeats */
      case 'sqsQueueScheduleRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: buildHeartBeatEventBridgeRule(scope, {
            ruleName: eventBridgeName,
          }),
        });
        break;
      }
      case 'internalHeartBeatScheduleRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: buildHeartBeatEventBridgeRule(scope, {
            ruleName: eventBridgeName,
          }),
        });
        break;
      }
      case 'externalHeartBeatScheduleRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: buildHeartBeatEventBridgeRule(scope, {
            ruleName: eventBridgeName,
          }),
        });
      }
    }
  }
  return eventBridgeObjects;
}
