/*
Build the ecs fargate task
*/

import { Construct } from 'constructs';
import {
  CPU_ARCHITECTURE_MAP,
  EcsFargateTaskConstruct,
} from '@orcabus/platform-cdk-constructs/ecs';
import * as path from 'path';
import { ECS_DIR } from '../constants';
import {
  BuildAllFargateEcsTasksProps,
  BuildFargateEcsTaskProps,
  ecsTaskNameList,
  EcsTaskObject,
} from './interfaces';
import { NagSuppressions } from 'cdk-nag';
import { ICAV2_BASE_URL } from '@orcabus/platform-cdk-constructs/shared-config/icav2';
import { camelCaseToSnakeCase } from '../utils';
import { lambdaNameList, LambdaObject } from '../lambda/interfaces';

function buildEcsFargateTask(scope: Construct, props: BuildFargateEcsTaskProps) {
  /*
    Build the Upload SinglePart File Fargate task.

    We use 2 CPUs for this task but we need a large amount of memory
    Since curl downloads and stored in memory and THEN uploads to S3 from memory
    The containerName will be set to 'upload-single-part-file-task'
    and the docker path can be found under ECS_DIR / 'ora_decompression'
    */

  /*
  Generate an ECS Fargate task construct with the provided properties.
  */

  const ecsTask = new EcsFargateTaskConstruct(scope, `${props.taskName}-ecs`, {
    containerName: props.taskName,
    dockerPath: path.join(ECS_DIR, camelCaseToSnakeCase(props.taskName)),
    nCpus: 2, // 2 CPUs
    memoryLimitGiB: 16, // 16 GB of memory (maximum for 2 CPUs)
    architecture: 'ARM64',
    runtimePlatform: CPU_ARCHITECTURE_MAP['ARM64'],
  });

  // Needs access to the secrets manager
  props.icav2AccessTokenSecretObj.grantRead(ecsTask.taskDefinition.taskRole);

  ecsTask.containerDefinition.addEnvironment(
    'ICAV2_ACCESS_TOKEN_SECRET_ID',
    props.icav2AccessTokenSecretObj.secretName
  );
  ecsTask.containerDefinition.addEnvironment('ICAV2_BASE_URL', ICAV2_BASE_URL);

  // Needs access to ORCABUS_TOKEN_SECRET_ID and HOSTNAME_SSM_PARAMETER_NAME
  ecsTask.containerDefinition.addEnvironment(
    'ORCABUS_TOKEN_SECRET_ID',
    props.orcabusTokenSecretObj.secretName
  );
  ecsTask.containerDefinition.addEnvironment(
    'HOSTNAME_SSM_PARAMETER_NAME',
    props.hostnameSsmParameter.parameterName
  );

  // Add suppressions for the task role
  // Since the task role needs to access the S3 bucket prefix
  NagSuppressions.addResourceSuppressions(
    [ecsTask.taskDefinition, ecsTask.taskExecutionRole],
    [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'The task role needs to access secrets manager.',
      },
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'We use the standard ecs task role for this task, which allows the guard duty agent to run alongside the task.',
      },
      {
        id: 'AwsSolutions-ECS2',
        reason:
          'The task is designed to run with some constant environment variables, not sure why this is a bad thing?',
      },
    ],
    true
  );

  return {
    taskName: props.taskName,
    ecsFargateTaskConstruct: ecsTask,
  };
}

export function buildAllEcsFargateTasks(
  scope: Construct,
  props: BuildAllFargateEcsTasksProps
): EcsTaskObject[] {
  // Iterate over lambdaLayerToMapping and create the lambda functions
  const ecsTaskObjects: EcsTaskObject[] = [];
  for (const ecsTaskName of ecsTaskNameList) {
    ecsTaskObjects.push(
      buildEcsFargateTask(scope, {
        ...props,
        taskName: ecsTaskName,
      })
    );
  }

  return ecsTaskObjects;
}
