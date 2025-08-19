// Standard cdk imports
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';

// Application imports
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';

// Local imports
import { StatelessApplicationStackConfig } from './interfaces';
import { DEFAULT_HEART_BEAT_EVENT_BRIDGE_RULE_NAME } from './constants';
import { NagSuppressions } from 'cdk-nag';
import { buildAllLambdas } from './lambda';
import { buildEventBridgeRules } from './event-rules';
import { buildAllStepFunctions } from './step-functions';
import { buildAllEventBridgeTargets } from './event-targets';
import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import { buildUploadSinglePartFileFargateTask } from './ecs';

export type StatelessApplicationStackProps = StatelessApplicationStackConfig & cdk.StackProps;

// Stateless Application Stack
export class StatelessApplicationStack extends cdk.Stack {
  public readonly stageName: StageName;
  constructor(scope: Construct, id: string, props: StatelessApplicationStackProps) {
    super(scope, id, props);
    this.stageName = props.stageName;

    // Get dynamodb table (built in the stateful stack)
    const dynamodbTable = dynamodb.TableV2.fromTableName(this, props.tableName, props.tableName);

    // Get the event bus objects
    const externalEventBusObject = events.EventBus.fromEventBusName(
      this,
      props.externalEventBusName,
      props.externalEventBusName
    );
    const internalEventBusObject = events.EventBus.fromEventBusName(
      this,
      props.internalEventBusName,
      props.internalEventBusName
    );

    // Get the icav2 secret
    const icav2AccessTokenSecretObj = secretsManager.Secret.fromSecretNameV2(
      this,
      props.icav2AccessTokenSecretId,
      props.icav2AccessTokenSecretId
    );

    // Build the lambdas
    const lambdaObjects = buildAllLambdas(this);

    // Build event bridge rules
    // We need to do this before the step functions are created
    // Since some of the step functions will be granted permissions to disable / enable
    // The heartbeat rule.
    const eventBridgeRuleObjects = buildEventBridgeRules(this, {
      internalEventBus: internalEventBusObject,
      externalEventBus: externalEventBusObject,
      eventSource: props.eventSource,
      eventDetailType: props.eventDetailType,
    });

    // Part 2 - Build ECS Tasks / Fargate Clusters
    const uploadSinglePartFileFargateTaskObj = buildUploadSinglePartFileFargateTask(this, {
      icav2AccessTokenSecretObj: icav2AccessTokenSecretObj,
    });

    // Build the step functions
    const stepFunctionObjects = buildAllStepFunctions(this, {
      lambdas: lambdaObjects,
      internalEventBus: internalEventBusObject,
      icav2CopyServiceEventSource: props.eventSource,
      icav2CopyServiceDetailType: props.eventDetailType,
      tableObj: dynamodbTable,
      uploadSinglePartFileEcsFargateObject: uploadSinglePartFileFargateTaskObj,
      heartBeatRuleName: DEFAULT_HEART_BEAT_EVENT_BRIDGE_RULE_NAME,
    });

    // Add the event-bridge rules
    buildAllEventBridgeTargets({
      eventBridgeRuleObjects: eventBridgeRuleObjects,
      stepFunctionObjects: stepFunctionObjects,
    });

    // Add in stack suppressions
    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'We need to add this for the lambdas to work',
      },
    ]);
  }
}
