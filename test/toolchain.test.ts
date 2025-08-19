import { App, Aspects } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { StatelessDeployStack } from '../infrastructure/toolchain/stateless-deploy-stack';
import { synthesisMessageToString } from './utils';
import { StatefulDeployStack } from '../infrastructure/toolchain/stateful-deploy-stack';
import { PROD_ENVIRONMENT } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';

describe('cdk-nag-stateless-toolchain-stack', () => {
  const app = new App({});

  const statelessStack = new StatelessDeployStack(app, 'StatelessStack', {
    env: PROD_ENVIRONMENT,
  });

  Aspects.of(statelessStack).add(new AwsSolutionsChecks());

  NagSuppressions.addStackSuppressions(statelessStack, [
    { id: 'AwsSolutions-IAM4', reason: 'Allow CDK Pipeline' },
    { id: 'AwsSolutions-IAM5', reason: 'Allow CDK Pipeline' },
    { id: 'AwsSolutions-S1', reason: 'Allow CDK Pipeline' },
    { id: 'AwsSolutions-KMS5', reason: 'Allow CDK Pipeline' },
    { id: 'AwsSolutions-CB3', reason: 'Allow CDK Pipeline' },
  ]);

  test(`cdk-nag AwsSolutions Pack errors`, () => {
    const errors = Annotations.fromStack(statelessStack)
      .findError('*', Match.stringLikeRegexp('AwsSolutions-.*'))
      .map(synthesisMessageToString);
    expect(errors).toHaveLength(0);
  });

  test(`cdk-nag AwsSolutions Pack warnings`, () => {
    const warnings = Annotations.fromStack(statelessStack)
      .findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'))
      .map(synthesisMessageToString);
    expect(warnings).toHaveLength(0);
  });
});

describe('cdk-nag-stateful-toolchain-stack', () => {
  const app = new App({});

  const statefulStack = new StatefulDeployStack(app, 'StatefulStack', {
    env: PROD_ENVIRONMENT,
  });

  Aspects.of(statefulStack).add(new AwsSolutionsChecks());

  NagSuppressions.addStackSuppressions(statefulStack, [
    { id: 'AwsSolutions-IAM4', reason: 'Allow CDK Pipeline' },
    { id: 'AwsSolutions-IAM5', reason: 'Allow CDK Pipeline' },
    { id: 'AwsSolutions-S1', reason: 'Allow CDK Pipeline' },
    { id: 'AwsSolutions-KMS5', reason: 'Allow CDK Pipeline' },
    { id: 'AwsSolutions-CB3', reason: 'Allow CDK Pipeline' },
  ]);

  test(`cdk-nag AwsSolutions Pack errors`, () => {
    const errors = Annotations.fromStack(statefulStack)
      .findError('*', Match.stringLikeRegexp('AwsSolutions-.*'))
      .map(synthesisMessageToString);
    expect(errors).toHaveLength(0);
  });

  test(`cdk-nag AwsSolutions Pack warnings`, () => {
    const warnings = Annotations.fromStack(statefulStack)
      .findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'))
      .map(synthesisMessageToString);
    expect(warnings).toHaveLength(0);
  });
});
