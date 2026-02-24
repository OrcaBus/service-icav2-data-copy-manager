/* Lambda stuff */

import { Construct } from 'constructs';
import {
  BuildLambdaProps,
  lambdaNameList,
  LambdaObject,
  lambdaToRequirementsMap,
} from './interfaces';
import { Duration } from 'aws-cdk-lib';

import * as lambda from 'aws-cdk-lib/aws-lambda';
import { PythonUvFunction } from '@orcabus/platform-cdk-constructs/lambda';
import * as path from 'path';
import { LAMBDA_DIR } from '../constants';
import { camelCaseToSnakeCase } from '../utils';

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
    timeout: Duration.seconds(900),
    memorySize: 2048, // 2GB
    includeOrcabusApiToolsLayer: lambdaRequirements.needsOrcabusApiTools,
    includeIcav2Layer: lambdaRequirements.needsIcav2Tools,
  });

  /* Return the function */
  return {
    lambdaName: props.lambdaName,
    lambdaFunction: lambdaFunction,
  };
}

export function buildAllLambdas(scope: Construct): LambdaObject[] {
  // Iterate over lambdaLayerToMapping and create the lambda functions
  const lambdaObjects: LambdaObject[] = [];
  for (const lambdaName of lambdaNameList) {
    lambdaObjects.push(
      buildLambda(scope, {
        lambdaName: lambdaName,
      })
    );
  }

  return lambdaObjects;
}
