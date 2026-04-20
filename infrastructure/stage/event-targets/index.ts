/* Event Bridge Target Stuff */
import {
  AddSfnAsEventBridgeTargetProps,
  eventBridgeTargetsNameList,
  EventBridgeTargetsProps,
} from './interfaces';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as events from 'aws-cdk-lib/aws-events';

function buildSfnEventBridgeTargetWithInputAsDetail(props: AddSfnAsEventBridgeTargetProps): void {
  props.eventBridgeRuleObj.addTarget(
    new eventsTargets.SfnStateMachine(props.stateMachineObj, {
      input: events.RuleTargetInput.fromEventPath('$.detail'),
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
      case 'externalCopyJobRuleToSendCopyJobsSfn': {
        buildSfnEventBridgeTargetWithInputAsDetail(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'listenExternalCopyJobRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) => eventBridgeObject.stateMachineName === 'sendCopyJobsToQueue'
          )?.stateMachineObj,
        });
        break;
      }
      case 'sqsHeartBeatScheduleRuleToSendHeartBeatSfn': {
        buildSfnEventBridgeTargetForScheduledEvents(<AddSfnAsEventBridgeTargetProps>{
          eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
            (eventBridgeObject) => eventBridgeObject.ruleName === 'sqsQueueScheduleRule'
          )?.ruleObject,
          stateMachineObj: props.stepFunctionObjects.find(
            (eventBridgeObject) => eventBridgeObject.stateMachineName === 'sendHeartbeatOfQueueJobs'
          )?.stateMachineObj,
        });
        break;
      }
      case 'internalHeartBeatScheduleRuleToSendHeartBeatSfn': {
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
      case 'externalHeartBeatScheduleRuleToSendHeartBeatSfn': {
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
