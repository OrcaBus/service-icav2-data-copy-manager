import * as events from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import { BuildEventBusProps } from './interfaces';

export function buildEventBus(scope: Construct, props: BuildEventBusProps) {
  return new events.EventBus(scope, props.eventBusName, {
    eventBusName: props.eventBusName,
    description: props.eventBusDescription,
  });
}
