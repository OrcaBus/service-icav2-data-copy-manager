import {
  BuildSfnProps,
  BuildSfnsProps,
  sfnNameList,
  SfnObject,
  SfnRequirementsMapType,
  WirePermissionsProps,
} from './interfaces';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import path from 'path';
import { STACK_PREFIX, STEP_FUNCTIONS_DIR } from '../constants';
import { camelCaseToSnakeCase } from '../utils';
import { Construct } from 'constructs';
import * as awsLogs from 'aws-cdk-lib/aws-logs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

function createStateMachineDefinitionSubstitutions(props: BuildSfnProps): {
  [key: string]: string;
} {
  /* Sfn permissions */
  const sfnRequirements = SfnRequirementsMapType[props.stateMachineName];

  /* Ensure that the state machine requirements are defined */
  const definitionSubstitutions: { [key: string]: string } = {};

  /* Substitute lambdas in the state machine definition */
  if (props.lambdas) {
    for (const lambdaObject of props.lambdas) {
      const sfnSubtitutionKey = `__${camelCaseToSnakeCase(lambdaObject.lambdaName)}_lambda_function_arn__`;
      definitionSubstitutions[sfnSubtitutionKey] =
        lambdaObject.lambdaFunction.currentVersion.functionArn;
    }
  }

  /* Needs Ecs permissions */
  if (sfnRequirements.needsEcsPermissions) {
    definitionSubstitutions['__cluster__'] =
      props.uploadSinglePartFileEcsFargateObject.cluster.clusterArn;
    definitionSubstitutions['__task_definition__'] =
      props.uploadSinglePartFileEcsFargateObject.taskDefinition.taskDefinitionArn;
    definitionSubstitutions['__subnets__'] =
      props.uploadSinglePartFileEcsFargateObject.cluster.vpc.privateSubnets
        .map((subnet) => subnet.subnetId)
        .join(',');
    definitionSubstitutions['__security_group__'] =
      props.uploadSinglePartFileEcsFargateObject.securityGroup.securityGroupId;
    definitionSubstitutions['__container_name__'] =
      props.uploadSinglePartFileEcsFargateObject.containerDefinition.containerName;
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
  if (props.internalHeartBeatRuleName) {
    definitionSubstitutions['__internal_heartbeat_event_bridge_rule_name__'] =
      props.internalHeartBeatRuleName;
  }
  if (props.externalHeartBeatRuleName) {
    definitionSubstitutions['__external_heartbeat_event_bridge_rule_name__'] =
      props.externalHeartBeatRuleName;
  }

  /* Substitute the event detail type in the state machine definition */
  if (props.icav2CopyServiceDetailType) {
    definitionSubstitutions['__event_detail_type__'] = props.icav2CopyServiceDetailType;
  }

  /* Substitute the event source in the state machine definition */
  if (props.icav2CopyServiceEventSource) {
    definitionSubstitutions['__event_source__'] = props.icav2CopyServiceEventSource;
  }

  /* Substitute the sfn object arn names in the state machine definition */
  if (props.handleCopyJobsSfnObject) {
    definitionSubstitutions['__handle_copy_jobs_state_machine_arn__'] =
      props.handleCopyJobsSfnObject.stateMachineObj.stateMachineArn;
  }

  return definitionSubstitutions;
}

function wireUpStateMachinePermissions(scope: Construct, props: WirePermissionsProps): void {
  /* Wire up sfn permissions */
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

  /* Grant invoke on the fargate upload single file task */
  if (sfnRequirements.needsEcsPermissions) {
    props.uploadSinglePartFileEcsFargateObject.taskDefinition.grantRun(props.stateMachineObj);

    /* Grant the state machine access to monitor the tasks */
    props.stateMachineObj.addToRolePolicy(
      new iam.PolicyStatement({
        resources: [
          `arn:aws:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:rule/StepFunctionsGetEventsForECSTaskRule`,
        ],
        actions: ['events:PutTargets', 'events:PutRule', 'events:DescribeRule'],
      })
    );

    /* Will need cdk nag suppressions for this */
    NagSuppressions.addResourceSuppressions(
      props.stateMachineObj,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Need ability to put targets and rules for ECS task monitoring',
        },
      ],
      true
    );
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
  if (sfnRequirements.needsInternalHeartBeatRuleObj) {
    /* Ensure that the heartbeat rule object is defined */
    if (!props.internalHeartBeatRuleName) {
      throw new Error(
        `Heartbeat rule object is not defined for state machine that requires it: ${props.stateMachineName}`
      );
    }
    props.stateMachineObj.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['events:EnableRule', 'events:DisableRule'],
        resources: [
          `arn:aws:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:rule/${props.internalHeartBeatRuleName}`,
        ],
      })
    );
  }
  if (sfnRequirements.needsExternalHeartBeatRuleObj) {
    /* Ensure that the heartbeat rule object is defined */
    if (!props.externalHeartBeatRuleName) {
      throw new Error(
        `Heartbeat rule object is not defined for state machine that requires it: ${props.stateMachineName}`
      );
    }
    props.stateMachineObj.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['events:EnableRule', 'events:DisableRule'],
        resources: [
          `arn:aws:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:rule/${props.externalHeartBeatRuleName}`,
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
    // Because we are using a wildcard for an IAM Resource policy
    NagSuppressions.addResourceSuppressions(
      props.stateMachineObj,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Need ability to send task success/failure/heartbeat to any state machine',
        },
      ],
      true
    );
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
    const distributedMapPolicy = new iam.Policy(scope, `${props.stateMachineName}-dist-map-role`, {
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
    NagSuppressions.addResourceSuppressions(
      [props.stateMachineObj, distributedMapPolicy],
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Distributed Map IAM Policy requires asterisk in the resource ARN',
        },
      ],
      true
    );
  }

  /* Add permissions to list the handle copy jobs step function executions and to describe them */
  if (sfnRequirements.needsHandleCopyJobsListExecutions) {
    // Ensure that the handle copy jobs step function object is defined
    if (!props.handleCopyJobsSfnObject) {
      throw new Error(
        `Handle copy jobs step function object is not defined for state machine that requires it: ${props.stateMachineName}`
      );
    }

    // List and describe executions for the handle copy jobs step function
    props.stateMachineObj.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['states:ListExecutions', 'states:DescribeExecution'],
        resources: [
          props.handleCopyJobsSfnObject.stateMachineObj.stateMachineArn,
          `arn:aws:states:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:execution:${props.handleCopyJobsSfnObject.stateMachineObj.stateMachineName}:*`,
        ],
      })
    );

    // Will need a cdk nag suppression for this
    NagSuppressions.addResourceSuppressions(
      [props.stateMachineObj],
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Distributed Map IAM Policy requires asterisk in the resource ARN',
        },
      ],
      true
    );
  }
}

function buildStepFunction(scope: Construct, props: BuildSfnProps): SfnObject {
  const sfnNameToSnakeCase = camelCaseToSnakeCase(props.stateMachineName);
  const sfnRequirements = SfnRequirementsMapType[props.stateMachineName];

  /* Create the state machine definition substitutions */
  const stateMachine = new sfn.StateMachine(scope, props.stateMachineName, {
    stateMachineName: `${STACK_PREFIX}-${props.stateMachineName}`,
    definitionBody: sfn.DefinitionBody.fromFile(
      path.join(STEP_FUNCTIONS_DIR, sfnNameToSnakeCase + `_sfn_template.asl.json`)
    ),
    definitionSubstitutions: createStateMachineDefinitionSubstitutions(props),
    stateMachineType: sfnRequirements.isExpress
      ? sfn.StateMachineType.EXPRESS
      : sfn.StateMachineType.STANDARD,
    logs: sfnRequirements.isExpress
      ? // Enable logging on the state machine for express step functions only
        {
          level: sfn.LogLevel.ALL,
          // Create a new log group for the state machine
          destination: new awsLogs.LogGroup(scope, `${props.stateMachineName}-logs`, {
            retention: RetentionDays.ONE_DAY,
          }),
          includeExecutionData: true,
        }
      : undefined,
  });

  /* Grant the state machine permissions */
  wireUpStateMachinePermissions(scope, {
    stateMachineObj: stateMachine,
    ...props,
  });

  /* Nag Suppressions */
  /* AwsSolutions-SF1 - We don't need ALL events to be logged */
  /* AwsSolutions-SF2 - We also don't need X-Ray tracing */
  NagSuppressions.addResourceSuppressions(
    stateMachine,
    [
      {
        id: 'AwsSolutions-SF1',
        reason: 'We do not need all events to be logged',
      },
      {
        id: 'AwsSolutions-SF2',
        reason: 'We do not need X-Ray tracing',
      },
    ],
    true
  );

  /* Return as a state machine object */
  return {
    stateMachineName: props.stateMachineName,
    stateMachineObj: stateMachine,
  };
}

export function buildAllStepFunctions(scope: Construct, props: BuildSfnsProps): SfnObject[] {
  // Initialize the step function objects
  const sfnObjects = [] as SfnObject[];

  // Iterate over lambdaLayerToMapping and create the lambda functions
  for (const sfnName of sfnNameList) {
    switch (sfnName) {
      case 'sendHeartbeatExternal': {
        /*
        Find the sfn object for the handle copy jobs step function
        */
        const handleCopyJobsObject = sfnObjects.find(
          (sfnObj) => sfnObj.stateMachineName === 'handleCopyJobs'
        );
        sfnObjects.push(
          buildStepFunction(scope, {
            stateMachineName: sfnName,
            ...props,
            handleCopyJobsSfnObject: handleCopyJobsObject,
          })
        );
        break;
      }
      default: {
        sfnObjects.push(
          buildStepFunction(scope, {
            stateMachineName: sfnName,
            ...props,
          })
        );
      }
    }
  }

  return sfnObjects;
}
