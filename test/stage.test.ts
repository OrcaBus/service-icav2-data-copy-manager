import { App, Aspects, Stack } from 'aws-cdk-lib';
import { Annotations, Match } from 'aws-cdk-lib/assertions';
import { SynthesisMessage } from 'aws-cdk-lib/cx-api';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { StatefulApplicationStack } from '../infrastructure/stage/stateful-application-stack';
import { getStatefulStackProps, getStatelessStackProps } from '../infrastructure/stage/config';
import { StatelessApplicationStack } from '../infrastructure/stage/stateless-application-stack';
import { PROD_ENVIRONMENT } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';

function synthesisMessageToString(sm: SynthesisMessage): string {
  return `${sm.entry.data} [${sm.id}]`;
}

describe('cdk-nag-stateful-stage-stack', () => {
  const app = new App({});

  // You should configure all stack (sateless, stateful) to be tested
  const statefulDeploy = new StatefulApplicationStack(app, 'TestStatefulDeploy', {
    env: PROD_ENVIRONMENT,
    ...getStatefulStackProps('PROD'),
  });

  Aspects.of(statefulDeploy).add(new AwsSolutionsChecks());
  applyNagSuppression(statefulDeploy);

  test(`cdk-nag AwsSolutions Pack errors`, () => {
    const errors = Annotations.fromStack(statefulDeploy)
      .findError('*', Match.stringLikeRegexp('AwsSolutions-.*'))
      .map(synthesisMessageToString);
    expect(errors).toHaveLength(0);
  });

  test(`cdk-nag AwsSolutions Pack warnings`, () => {
    const warnings = Annotations.fromStack(statefulDeploy)
      .findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'))
      .map(synthesisMessageToString);
    expect(warnings).toHaveLength(0);
  });
});

describe('cdk-nag-stateless-stage-stack', () => {
  const app = new App({});

  // You should configure all stack (sateless, stateful) to be tested
  const statelessDeploy = new StatelessApplicationStack(app, 'TestStatelessDeploy', {
    env: PROD_ENVIRONMENT,
    ...getStatelessStackProps('PROD'),
  });

  Aspects.of(statelessDeploy).add(new AwsSolutionsChecks());
  applyNagSuppression(statelessDeploy);

  test(`cdk-nag AwsSolutions Pack errors`, () => {
    const errors = Annotations.fromStack(statelessDeploy)
      .findError('*', Match.stringLikeRegexp('AwsSolutions-.*'))
      .map(synthesisMessageToString);
    expect(errors).toHaveLength(0);
  });

  test(`cdk-nag AwsSolutions Pack warnings`, () => {
    const warnings = Annotations.fromStack(statelessDeploy)
      .findWarning('*', Match.stringLikeRegexp('AwsSolutions-.*'))
      .map(synthesisMessageToString);
    expect(warnings).toHaveLength(0);
  });
});

/**
 * apply nag suppression
 * @param stack
 */
function applyNagSuppression(stack: Stack) {
  NagSuppressions.addStackSuppressions(
    stack,
    [{ id: 'AwsSolutions-S10', reason: 'not require requests to use SSL' }],
    true
  );
}
