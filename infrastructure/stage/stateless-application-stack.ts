// Standard cdk imports
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import * as events from 'aws-cdk-lib/aws-events';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import { Rule } from 'aws-cdk-lib/aws-events';

// Application imports
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

// Local imports
import {
  AddSfnAsEventBridgeTargetProps,
  BuildLambdaProps,
  BuildLambdasProps,
  BuildSfnProps,
  BuildSfnsProps,
  eventBridgeNameList,
  eventBridgeTargetsNameList,
  EventBridgeRuleObject,
  EventBridgeRuleProps,
  EventBridgeRulesProps,
  EventBridgeTargetsProps,
  ExternalEventBridgeRuleProps,
  HeartBeatEventBridgeRuleProps,
  InternalEventBridgeRuleProps,
  lambdaNameList,
  LambdaObject,
  lambdaToRequirementsMap,
  sfnNameList,
  SfnObject,
  SfnRequirementsMapType,
  StatelessApplicationStackConfig,
  WirePermissionsProps,
} from './interfaces';
import path from 'path';
import { Duration } from 'aws-cdk-lib';
import {
  DEFAULT_HEART_BEAT_EVENT_BRIDGE_RULE_NAME,
  DEFAULT_HEART_BEAT_INTERVAL,
  ICA_COPY_JOB_EVENT_CODE,
  LAMBDA_DIR,
  STEP_FUNCTIONS_DIR,
} from './constants';
import { NagSuppressions } from 'cdk-nag';

export type StatelessApplicationStackProps = StatelessApplicationStackConfig & cdk.StackProps;

// Stateless Application Stack
export class StatelessApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: StatelessApplicationStackProps) {
    super(scope, id, props);

    // Get dynamodb table (built in the stateful stack)
    const dynamodbTable = dynamodb.TableV2.fromTableName(this, props.tableName, props.tableName);

    // Get ICAv2 Access token secret object for construct
    const icav2AccessTokenSecretObj = secretsManager.Secret.fromSecretNameV2(
      this,
      'Icav2SecretsObject',
      props.icav2AccessTokenSecretId
    );

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

    // Build the lambdas
    const lambdaObjects = this.buildAllLambdas({
      icav2AccessTokenSecretObj: icav2AccessTokenSecretObj,
    });

    // Build event bridge rules
    // We need to do this before the step functions are created
    // Since some of the step functions will be granted permissions to disable / enable
    // The heartbeat rule.
    const eventBridgeRuleObjects = this.buildEventBridgeRules({
      internalEventBus: internalEventBusObject,
      externalEventBus: externalEventBusObject,
      eventSource: props.eventSource,
      eventDetailType: props.eventDetailType,
    });

    // Build the step functions
    const stepFunctionObjects = this.buildAllStepFunctions({
      lambdas: lambdaObjects,
      internalEventBus: internalEventBusObject,
      icav2CopyServiceEventSource: props.eventSource,
      icav2CopyServiceDetailType: props.eventDetailType,
      tableObj: dynamodbTable,
      heartBeatRuleName: DEFAULT_HEART_BEAT_EVENT_BRIDGE_RULE_NAME,
    });

    // Add the event-bridge rules
    this.buildAllEventBridgeTargets({
      eventBridgeRuleObjects: eventBridgeRuleObjects,
      stepFunctionObjects: stepFunctionObjects,
    });
  }

  /* Lambda stuff */
  private buildAllLambdas(props: BuildLambdasProps): LambdaObject[] {
    // Iterate over lambdaLayerToMapping and create the lambda functions
    const lambdaObjects: LambdaObject[] = [];
    for (const lambdaName of lambdaNameList) {
      lambdaObjects.push(
        this.buildLambda({
          lambdaName: lambdaName,
          icav2AccessTokenSecretObj: props.icav2AccessTokenSecretObj,
        })
      );
    }

    return lambdaObjects;
  }

  private buildLambda(props: BuildLambdaProps): LambdaObject {
    const lambdaNameToSnakeCase = this.camelCaseToSnakeCase(props.lambdaName);

    // Create the lambda function
    const lambdaFunction = new PythonFunction(this, props.lambdaName, {
      entry: path.join(LAMBDA_DIR, lambdaNameToSnakeCase + '_py'),
      runtime: lambda.Runtime.PYTHON_3_12,
      architecture: lambda.Architecture.ARM_64,
      index: lambdaNameToSnakeCase + '.py',
      handler: 'handler',
      timeout: Duration.seconds(60),
      memorySize: 2048,
    });

    // CDK Nag suppression (L1)
    NagSuppressions.addResourceSuppressions(
      lambdaFunction,
      [
        {
          id: 'AwsSolutions-L1',
          reason: 'Will migrate to PYTHON_3_13 ASAP, soz',
        },
      ],
      true
    );

    /* Check if this lambda needs access to the icav2 access token */
    if (lambdaToRequirementsMap[props.lambdaName].needsIcav2AccessToken) {
      /* Add the ICAv2 access token secret ARN to the environment variables */
      lambdaFunction.addEnvironment(
        /* Add the ICAv2 access token secret ARN to the environment variables */
        'ICAV2_ACCESS_TOKEN_SECRET_ID',
        props.icav2AccessTokenSecretObj.secretName
      );

      /* Give the lambda function read access to the ICAv2 access token secret */
      props.icav2AccessTokenSecretObj.grantRead(lambdaFunction.currentVersion);
    }

    /* Return the function */
    return {
      lambdaName: props.lambdaName,
      lambdaFunction: lambdaFunction,
    };
  }

  /* Event bridge rules */
  private buildHeartBeatEventBridgeRule(props: HeartBeatEventBridgeRuleProps): Rule {
    return new events.Rule(this, props.ruleName, {
      ruleName: props.ruleName,
      schedule: events.Schedule.rate(props.scheduleDuration ?? DEFAULT_HEART_BEAT_INTERVAL),
    });
  }

  private buildInternalCopyJobRule(props: InternalEventBridgeRuleProps): Rule {
    return new events.Rule(this, props.ruleName, {
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

  private buildInternalTaskTokenRule(props: InternalEventBridgeRuleProps): Rule {
    return new events.Rule(this, props.ruleName, {
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

  private buildExternalCopyJobRule(props: ExternalEventBridgeRuleProps): Rule {
    return new events.Rule(this, props.ruleName, {
      ruleName: props.ruleName,
      eventPattern: {
        detailType: [props.eventDetailType],
      },
      eventBus: props.eventBus,
    });
  }

  private buildICAv2EventPipeRule(props: EventBridgeRuleProps): Rule {
    return new events.Rule(this, props.ruleName, {
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

  private buildEventBridgeRules(props: EventBridgeRulesProps): EventBridgeRuleObject[] {
    const eventBridgeObjects: EventBridgeRuleObject[] = [];
    for (const eventBridgeName of eventBridgeNameList) {
      switch (eventBridgeName) {
        case 'listenInternalCopyJobRule': {
          eventBridgeObjects.push({
            ruleName: eventBridgeName,
            ruleObject: this.buildInternalCopyJobRule({
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
            ruleObject: this.buildInternalTaskTokenRule({
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
            ruleObject: this.buildExternalCopyJobRule({
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
            ruleObject: this.buildICAv2EventPipeRule({
              ruleName: eventBridgeName,
              eventBus: props.internalEventBus,
            }),
          });
          break;
        }
        case 'heartBeatScheduleRule': {
          eventBridgeObjects.push({
            ruleName: eventBridgeName,
            ruleObject: this.buildHeartBeatEventBridgeRule({
              ruleName: eventBridgeName,
            }),
          });
          break;
        }
      }
    }
    return eventBridgeObjects;
  }

  private createStateMachineDefinitionSubstitutions(props: BuildSfnProps): {
    [key: string]: string;
  } {
    const definitionSubstitutions: { [key: string]: string } = {};

    /* Substitute lambdas in the state machine definition */
    if (props.lambdas) {
      for (const lambdaObject of props.lambdas) {
        const sfnSubtitutionKey = `__${this.camelCaseToSnakeCase(lambdaObject.lambdaName)}_lambda_function_arn__`;
        definitionSubstitutions[sfnSubtitutionKey] =
          lambdaObject.lambdaFunction.currentVersion.functionArn;
      }
    }

    /* Substitute the event bus in the state machine definition */
    if (props.internalEventBus) {
      definitionSubstitutions['__internal_event_bus_name__'] = props.internalEventBus.eventBusName;
    }

    /* Substitute the dynamodb table in the state machine definition */
    if (props.tableObj) {
      definitionSubstitutions['__table_name__'] = props.tableObj.tableName;
    }

    /* Substitute the event bridge rule name in the state machine definition */
    if (props.heartBeatRuleName) {
      definitionSubstitutions['__heartbeat_event_bridge_rule_name__'] = props.heartBeatRuleName;
    }

    /* Substitute the event detail type in the state machine definition */
    if (props.icav2CopyServiceDetailType) {
      definitionSubstitutions['__event_detail_type__'] = props.icav2CopyServiceDetailType;
    }

    /* Substitute the event source in the state machine definition */
    if (props.icav2CopyServiceEventSource) {
      definitionSubstitutions['__event_source__'] = props.icav2CopyServiceEventSource;
    }

    return definitionSubstitutions;
  }

  private wireUpStateMachinePermissions(props: WirePermissionsProps): void {
    /* Wire up lambda permissions */
    const sfnRequirements = SfnRequirementsMapType[props.stateMachineName];

    /* Grant invoke on all lambdas required for this state machine */
    if (sfnRequirements.requiredLambdaNameList) {
      for (const lambdaName of sfnRequirements.requiredLambdaNameList) {
        if (!props.lambdas) {
          throw new Error(
            `Lambdas are not defined for state machine that requires them: ${props.stateMachineName}`
          );
        }
        const lambdaObject = props.lambdas.find((lambda) => lambda.lambdaName === lambdaName);
        lambdaObject?.lambdaFunction.currentVersion.grantInvoke(props.stateMachineObj);
      }
    }

    /* Wire up event bus permissions */
    if (sfnRequirements.needsInternalEventBus) {
      if (!props.internalEventBus) {
        throw new Error(
          `Internal event bus is not defined for state machine that requires it: ${props.stateMachineName}`
        );
      }
      props.internalEventBus.grantPutEventsTo(props.stateMachineObj);
    }

    /* Wire up dynamodb table permissions */
    if (sfnRequirements.needsTableObj) {
      if (!props.tableObj) {
        throw new Error(
          `DynamoDB table is not defined for state machine that requires it: ${props.stateMachineName}`
        );
      }
      props.tableObj.grantReadWriteData(props.stateMachineObj);
    }

    /* Wire up event bridge rule permissions */
    if (sfnRequirements.needsHeartBeatRuleObj) {
      /* Ensure that the heartbeat rule object is defined */
      if (!props.heartBeatRuleName) {
        throw new Error(
          `Heartbeat rule object is not defined for state machine that requires it: ${props.stateMachineName}`
        );
      }
      props.stateMachineObj.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['events:EnableRule', 'events:DisableRule'],
          resources: [
            `arn:aws:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:rule/${props.heartBeatRuleName}`,
          ],
        })
      );
    }

    /* Wire up IAM permissions manually for task token */
    if (sfnRequirements.needsTaskTokenUpdatePermissions) {
      // Allow step function to perform SendTaskSuccess, SendTaskFailure and SendTaskHeartbeat
      // To any step function
      props.stateMachineObj.addToRolePolicy(
        new iam.PolicyStatement({
          resources: [`arn:aws:states:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stateMachine:*`],
          actions: ['states:SendTaskSuccess', 'states:SendTaskFailure', 'states:SendTaskHeartbeat'],
        })
      );

      // Will need cdk nag suppressions for this
    }

    /* Add in distributed map policy */
    if (sfnRequirements.needsDistributedMapPolicies) {
      // Requirement for distributed maps to work
      /* State machine runs a distributed map */
      // Because this steps execution uses a distributed map running an express step function, we
      // have to wire up some extra permissions
      // Grant the state machine's role to execute itself
      // However we cannot just grant permission to the role as this will result in a circular dependency
      // between the state machine and the role
      // Instead we use the workaround here - https://github.com/aws/aws-cdk/issues/28820#issuecomment-1936010520
      const distributedMapPolicy = new iam.Policy(this, `${props.stateMachineName}-dist-map-role`, {
        document: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              resources: [props.stateMachineObj.stateMachineArn],
              actions: ['states:StartExecution'],
            }),
            new iam.PolicyStatement({
              resources: [
                `arn:aws:states:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:execution:${props.stateMachineObj.stateMachineName}/*:*`,
              ],
              actions: ['states:RedriveExecution'],
            }),
          ],
        }),
      });

      // Add the policy to the state machine role
      props.stateMachineObj.role.attachInlinePolicy(distributedMapPolicy);

      // Will need a cdk nag suppression for this
    }
  }

  private buildStepFunction(props: BuildSfnProps): SfnObject {
    const sfnNameToSnakeCase = this.camelCaseToSnakeCase(props.stateMachineName);

    /* Create the state machine definition substitutions */
    const stateMachine = new sfn.StateMachine(this, props.stateMachineName, {
      stateMachineName: `icav2-${props.stateMachineName}`,
      definitionBody: sfn.DefinitionBody.fromFile(
        path.join(STEP_FUNCTIONS_DIR, sfnNameToSnakeCase + `_sfn_template.asl.json`)
      ),
      definitionSubstitutions: this.createStateMachineDefinitionSubstitutions(props),
    });

    /* Grant the state machine permissions */
    this.wireUpStateMachinePermissions({
      stateMachineObj: stateMachine,
      ...props,
    });

    /* Return as a state machine object */
    return {
      stateMachineName: props.stateMachineName,
      stateMachineObj: stateMachine,
    };
  }

  private buildAllStepFunctions(props: BuildSfnsProps): SfnObject[] {
    // Initialize the step function objects
    const sfnObjects = [] as SfnObject[];

    // Iterate over lambdaLayerToMapping and create the lambda functions
    for (const sfnName of sfnNameList) {
      sfnObjects.push(
        this.buildStepFunction({
          stateMachineName: sfnName,
          ...props,
        })
      );
    }

    return sfnObjects;
  }

  /* Event Bridge Target Stuff */
  private buildSfnEventBridgeTargetWithInputAsDetail(props: AddSfnAsEventBridgeTargetProps): void {
    props.eventBridgeRuleObj.addTarget(
      new eventsTargets.SfnStateMachine(props.stateMachineObj, {
        input: events.RuleTargetInput.fromEventPath('$.detail'),
      })
    );
  }

  private buildSfnEventBridgeTargetForScheduledEvents(props: AddSfnAsEventBridgeTargetProps): void {
    props.eventBridgeRuleObj.addTarget(new eventsTargets.SfnStateMachine(props.stateMachineObj));
  }

  private buildSfnEventBridgeTargetFromIcaEventPipe(props: AddSfnAsEventBridgeTargetProps): void {
    props.eventBridgeRuleObj.addTarget(
      new eventsTargets.SfnStateMachine(props.stateMachineObj, {
        input: events.RuleTargetInput.fromEventPath('$.detail.ica-event.payload'),
      })
    );
  }

  private buildAllEventBridgeTargets(props: EventBridgeTargetsProps): void {
    /* Iterate over each event bridge rule and add the target */
    for (const eventBridgeTargetsName of eventBridgeTargetsNameList) {
      switch (eventBridgeTargetsName) {
        case 'internalCopyJobRuleToHandleCopyJobsSfn': {
          this.buildSfnEventBridgeTargetWithInputAsDetail(<AddSfnAsEventBridgeTargetProps>{
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
          this.buildSfnEventBridgeTargetWithInputAsDetail(<AddSfnAsEventBridgeTargetProps>{
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
          this.buildSfnEventBridgeTargetWithInputAsDetail(<AddSfnAsEventBridgeTargetProps>{
            eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
              (eventBridgeObject) => eventBridgeObject.ruleName === 'listenExternalCopyJobRule'
            )?.ruleObject,
            stateMachineObj: props.stepFunctionObjects.find(
              (eventBridgeObject) => eventBridgeObject.stateMachineName === 'handleCopyJobs'
            )?.stateMachineObj,
          });
          break;
        }
        case 'iCAv2CopyJobEventPipeToSendInternalTaskTokenSfn': {
          this.buildSfnEventBridgeTargetFromIcaEventPipe(<AddSfnAsEventBridgeTargetProps>{
            eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
              (eventBridgeObject) =>
                eventBridgeObject.ruleName === 'listenICAv2CopyJobEventPipeRule'
            )?.ruleObject,
            stateMachineObj: props.stepFunctionObjects.find(
              (eventBridgeObject) => eventBridgeObject.stateMachineName === 'sendInternalTaskToken'
            )?.stateMachineObj,
          });
          break;
        }
        case 'heartBeatScheduleRuleToSendHeartbeatSfn': {
          this.buildSfnEventBridgeTargetForScheduledEvents(<AddSfnAsEventBridgeTargetProps>{
            eventBridgeRuleObj: props.eventBridgeRuleObjects.find(
              (eventBridgeObject) => eventBridgeObject.ruleName === 'heartBeatScheduleRule'
            )?.ruleObject,
            stateMachineObj: props.stepFunctionObjects.find(
              (eventBridgeObject) => eventBridgeObject.stateMachineName === 'sendHeartbeat'
            )?.stateMachineObj,
          });
          break;
        }
      }
    }
  }

  /* Utils */
  private camelCaseToSnakeCase(camelCase: string): string {
    return camelCase.replace(/([A-Z])/g, '_$1').toLowerCase();
  }
}
