#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StatelessDeployStack } from '../infrastructure/toolchain/stateless-deploy-stack';
import { StatefulDeployStack } from '../infrastructure/toolchain/stateful-deploy-stack';
import { TOOLCHAIN_ENVIRONMENT } from '@orcabus/platform-cdk-constructs/deployment-stack-pipeline';

const app = new cdk.App();

const deployMode = app.node.tryGetContext('deployMode');
if (!deployMode) {
  throw new Error("deployMode is required in context ('-c deployMode=stateless')");
}

if (deployMode === 'stateless') {
  new StatelessDeployStack(app, 'OrcaBusStatelessServiceStack', {
    env: TOOLCHAIN_ENVIRONMENT,
  });
} else if (deployMode === 'stateful') {
  new StatefulDeployStack(app, 'OrcaBusStatefulServiceStack', {
    env: TOOLCHAIN_ENVIRONMENT,
  });
} else {
  throw new Error("Invalid 'deployMode` set in the context");
}
