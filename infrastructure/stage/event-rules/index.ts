import {
  eventBridgeNameList,
  EventBridgeRuleObject,
  EventBridgeRuleProps,
  EventBridgeRulesProps,
  ExternalEventBridgeRuleProps,
  HeartBeatEventBridgeRuleProps,
  InternalEventBridgeRuleProps,
} from './interfaces';
import { Rule } from 'aws-cdk-lib/aws-events';
import * as events from 'aws-cdk-lib/aws-events';
import { DEFAULT_HEART_BEAT_INTERVAL, ICA_COPY_JOB_EVENT_CODE } from '../constants';
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

function buildInternalCopyJobRule(scope: Construct, props: InternalEventBridgeRuleProps): Rule {
  return new events.Rule(scope, props.ruleName, {
    ruleName: props.ruleName,
    eventPattern: {
      source: [props.eventSource],
      detailType: [props.eventDetailType],
      detail: {
        payload: {
          destinationUri: [{ exists: true }],
          sourceUriList: [{ exists: true }],
        },
      },
    },
    eventBus: props.eventBus,
  });
}

function buildInternalTaskTokenRule(scope: Construct, props: InternalEventBridgeRuleProps): Rule {
  return new events.Rule(scope, props.ruleName, {
    ruleName: props.ruleName,
    eventPattern: {
      source: [props.eventSource],
      detailType: [props.eventDetailType],
      detail: {
        jobId: [{ exists: true }],
      },
    },
    eventBus: props.eventBus,
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
          sourceUriList: [{ exists: true }],
        },
      },
    },
    eventBus: props.eventBus,
  });
}

function buildExternalCopyJobLegacyRule(
  scope: Construct,
  props: ExternalEventBridgeRuleProps
): Rule {
  return new events.Rule(scope, props.ruleName, {
    ruleName: props.ruleName,
    eventPattern: {
      detailType: [props.eventDetailType],
      detail: {
        destinationUri: [{ exists: true }],
        sourceUriList: [{ exists: true }],
      },
    },
    eventBus: props.eventBus,
  });
}

function buildICAv2EventPipeRule(scope: Construct, props: EventBridgeRuleProps): Rule {
  return new events.Rule(scope, props.ruleName, {
    ruleName: props.ruleName,
    eventPattern: {
      detail: {
        'ica-event': {
          // ICA_JOB_001 is a job state change in ICAv2
          eventCode: [ICA_COPY_JOB_EVENT_CODE],
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
      case 'listenInternalCopyJobRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: buildInternalCopyJobRule(scope, {
            ruleName: eventBridgeName,
            eventBus: props.internalEventBus,
            eventSource: props.eventSource,
            eventDetailType: props.eventDetailType,
          }),
        });
        break;
      }
      case 'listenInternalTaskTokenRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: buildInternalTaskTokenRule(scope, {
            ruleName: eventBridgeName,
            eventBus: props.internalEventBus,
            eventSource: props.eventSource,
            eventDetailType: props.eventDetailType,
          }),
        });
        break;
      }
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
      case 'listenExternalCopyJobLegacyRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: buildExternalCopyJobLegacyRule(scope, {
            ruleName: eventBridgeName,
            eventBus: props.externalEventBus,
            eventDetailType: props.eventDetailType,
          }),
        });
        break;
      }
      case 'listenICAv2CopyJobEventPipeRule': {
        eventBridgeObjects.push({
          ruleName: eventBridgeName,
          ruleObject: buildICAv2EventPipeRule(scope, {
            ruleName: eventBridgeName,
            eventBus: props.internalEventBus,
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
