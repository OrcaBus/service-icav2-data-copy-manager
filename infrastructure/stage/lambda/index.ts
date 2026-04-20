/* Lambda stuff */

import { Construct } from 'constructs';
import {
  BuildLambdaProps,
  BuildLambdasProps,
  lambdaNameList,
  LambdaObject,
  lambdaToRequirementsMap,
} from './interfaces';
import { Duration } from 'aws-cdk-lib';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { PythonUvFunction } from '@orcabus/platform-cdk-constructs/lambda';
import * as path from 'path';
import {
  DEFAULT_COPY_JOB_QUEUE_MAX_LAMBDA_CONCURRENCY,
  LAMBDA_DIR,
  STACK_PREFIX,
} from '../constants';
import { camelCaseToSnakeCase } from '../utils';
import { NagSuppressions } from 'cdk-nag';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

function buildLambda(scope: Construct, props: BuildLambdaProps): LambdaObject {
  const lambdaNameToSnakeCase = camelCaseToSnakeCase(props.lambdaName);
  const lambdaRequirements = lambdaToRequirementsMap[props.lambdaName];

  // Create the lambda function
  const lambdaFunction = new PythonUvFunction(scope, `${props.lambdaName}-lambda`, {
    entry: path.join(LAMBDA_DIR, lambdaNameToSnakeCase + '_py'),
    runtime: lambda.Runtime.PYTHON_3_14,
    architecture: lambda.Architecture.ARM_64,
    index: lambdaNameToSnakeCase + '.py',
    handler: 'handler',
    timeout: lambdaRequirements.needsDurableExecutionPermissions
      ? undefined
      : Duration.seconds(900),
    memorySize: 2048, // 2GB
    durableConfig: lambdaRequirements.needsDurableExecutionPermissions
      ? { executionTimeout: Duration.seconds(900) }
      : undefined,
    includeOrcabusApiToolsLayer: lambdaRequirements.needsOrcabusApiTools,
    includeIcav2Layer: lambdaRequirements.needsIcav2Tools,
  });

  if (lambdaRequirements.needsCallbackPermissions) {
    // Grant write permissions to allow the lambda to unlock durable executions
    // We don't know the exact resource ARNs here since they are created dynamically
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['lambda:SendDurableExecutionCallbackSuccess'],
        resources: [
          `arn:aws:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:*:*/durable-execution/*/*`,
        ],
      })
    );

    // Add resource suppressions
    NagSuppressions.addResourceSuppressions(
      lambdaFunction,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Send DurableExecutionCallback success permissions to dynamic resources.',
          appliesTo: [
            'Resource::arn:aws:lambda:<AWS::Region>:<AWS::AccountId>:function:*:*/durable-execution/*/*',
          ],
        },
      ],
      true
    );
  }

  // Set DB Permissions
  if (lambdaRequirements.needsDbPermissions) {
    props.tableObj.grantReadWriteData(lambdaFunction);
    // Set the environment variable on the lambda function
    // When we generate the state machine we will give the lambda permission to start the execution
    lambdaFunction.addEnvironment('DATABASE_NAME', props.tableObj.tableName);

    // Add resource suppressions
    NagSuppressions.addResourceSuppressions(
      lambdaFunction,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Allows multiple versions of the lambda function to write to the table',
        },
      ],
      true
    );
  }

  // Set Sqs Lambda Event Sources
  if (lambdaRequirements.needsSqsEventSource) {
    // Throttle copy jobs needs the sqs event source
    if (props.lambdaName === 'throttleCopyJobs') {
      // Find the SQS queue from the props
      lambdaFunction.currentVersion.addEventSource(
        new SqsEventSource(props.copyJobQueue, {
          maxConcurrency: DEFAULT_COPY_JOB_QUEUE_MAX_LAMBDA_CONCURRENCY,
          // Allow only one message per batch to be processed
          batchSize: 1,
        })
      );
    }
  }

  // SFN Executions
  // ICA State change lambda
  if (props.lambdaName === 'throttleCopyJobs') {
    // Add the step function
    // Update the environment variable for the step function name
    // When we generate the state machine we will give the lambda permission to start the execution
    lambdaFunction.addEnvironment(
      'HANDLE_COPY_JOB_SFN_ARN',
      `arn:aws:states:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stateMachine:${STACK_PREFIX}--${props.handleCopyJobSfnName}`
    );
  }
  /* Return the function */
  return {
    lambdaName: props.lambdaName,
    lambdaFunction: lambdaFunction,
  };
}

export function buildAllLambdas(scope: Construct, props: BuildLambdasProps): LambdaObject[] {
  // Iterate over lambdaLayerToMapping and create the lambda functions
  const lambdaObjects: LambdaObject[] = [];
  for (const lambdaName of lambdaNameList) {
    lambdaObjects.push(
      buildLambda(scope, {
        lambdaName: lambdaName,
        ...props,
      })
    );
  }

  return lambdaObjects;
}
