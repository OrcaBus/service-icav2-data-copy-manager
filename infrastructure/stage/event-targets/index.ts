/* Event Bridge Target Stuff */
import {
  AddSfnAsEventBridgeTargetProps,
  eventBridgeTargetsNameList,
  EventBridgeTargetsProps,
} from './interfaces';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as events from 'aws-cdk-lib/aws-events';
import { EventField } from 'aws-cdk-lib/aws-events';

function buildSfnEventBridgeTargetWithInputAsDetail(props: AddSfnAsEventBridgeTargetProps): void {
  props.eventBridgeRuleObj.addTarget(
    new eventsTargets.SfnStateMachine(props.stateMachineObj, {
      input: events.RuleTargetInput.fromEventPath('$.detail'),
    })
  );
}

function buildSfnEventBridgeTargetForLegacyEvents(props: AddSfnAsEventBridgeTargetProps): void {
  props.eventBridgeRuleObj.addTarget(
    new eventsTargets.SfnStateMachine(props.stateMachineObj, {
      input: events.RuleTargetInput.fromObject({
        payload: {
          sourceUriList: EventField.fromPath('$.detail.sourceUriList'),
          destinationUri: EventField.fromPath('$.detail.destinationUri'),
        },
        taskToken: EventField.fromPath('$.detail.taskToken'),
      }),
    })
  );
}

function buildSfnEventBridgeTargetForScheduledEvents(props: AddSfnAsEventBridgeTargetProps): void {
  props.eventBridgeRuleObj.addTarget(new eventsTargets.SfnStateMachine(props.stateMachineObj));
}

export function buildAllEventBridgeTargets(props: EventBridgeTargetsProps): void {
  /* Iterate over each event bridge rule and add the target */
  for (const eventBridgeTargetsName of eventBridgeTargetsNameList) {
    switch (eventBridgeTargetsName) {
      case 'internalCopyJobRuleToHandleCopyJobsSfn': {
        buildSfnEventBridgeTargetWithInputAsDetail(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'listenInternalCopyJobRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) => eventBridgeObject.stateMachineName === 'handleCopyJobs'
          )?.stateMachineObj,
        });
        break;
      }
      case 'internalTaskTokenRuleToSaveJobAndInternalTaskTokenSfn': {
        buildSfnEventBridgeTargetWithInputAsDetail(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'listenInternalTaskTokenRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) =>
              eventBridgeObject.stateMachineName === 'saveJobAndInternalTaskToken'
          )?.stateMachineObj,
        });
        break;
      }
      case 'externalCopyJobRuleToHandleCopyJobsSfn': {
        buildSfnEventBridgeTargetWithInputAsDetail(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'listenExternalCopyJobRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) => eventBridgeObject.stateMachineName === 'handleCopyJobs'
          )?.stateMachineObj,
        });
        break;
      }
      case 'externalCopyJobLegacyRuleToHandleCopyJobsSfn': {
        buildSfnEventBridgeTargetForLegacyEvents(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'listenExternalCopyJobLegacyRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) => eventBridgeObject.stateMachineName === 'handleCopyJobs'
          )?.stateMachineObj,
        });
        break;
      }
      case 'internalHeartBeatScheduleRuleToSendHeartbeatSfn': {
        buildSfnEventBridgeTargetForScheduledEvents(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'internalHeartBeatScheduleRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) => eventBridgeObject.stateMachineName === 'sendHeartbeatInternal'
          )?.stateMachineObj,
        });
        break;
      }
      case 'externalHeartBeatScheduleRuleToSendHeartbeatSfn': {
        buildSfnEventBridgeTargetForScheduledEvents(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'externalHeartBeatScheduleRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) => eventBridgeObject.stateMachineName === 'sendHeartbeatExternal'
          )?.stateMachineObj,
        });
        break;
      }
    }
  }
}
