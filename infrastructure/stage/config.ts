import { StageName } from '@orcabus/platform-cdk-constructs/utils';
import {
  EVENT_BUS_NAME_EXTERNAL,
  EVENT_BUS_NAME_INTERNAL,
  EVENT_DETAIL_TYPE_EXTERNAL,
  EVENT_SOURCE,
  ICA_EVENT_PIPE_STACK_NAME,
  icav2AccessTokenSecretId,
  INTERNAL_EVENT_BUS_DESCRIPTION,
  TABLE_NAME,
  TABLE_REMOVAL_POLICY,
} from './constants';
import { StatefulApplicationStackConfig, StatelessApplicationStackConfig } from './interfaces';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getStatefulStackProps = (stage: StageName): StatefulApplicationStackConfig => {
  return {
    /* Table stuff */
    tableName: TABLE_NAME,
    tableRemovalPolicy: TABLE_REMOVAL_POLICY,

    /* Event Bus stuff */
    internalEventBusName: EVENT_BUS_NAME_INTERNAL,
    internalEventBusDescription: INTERNAL_EVENT_BUS_DESCRIPTION,
  };
};

export const getStatelessStackProps = (stage: StageName): StatelessApplicationStackConfig => {
  return {
    /* Table name */
    tableName: TABLE_NAME,

    /* Secrets */
    icav2AccessTokenSecretId: icav2AccessTokenSecretId[stage],

    /* Event stuff */
    internalEventBusName: EVENT_BUS_NAME_INTERNAL,
    externalEventBusName: EVENT_BUS_NAME_EXTERNAL,
    eventDetailType: EVENT_DETAIL_TYPE_EXTERNAL,
    eventSource: EVENT_SOURCE,
    icaEventPipeName: ICA_EVENT_PIPE_STACK_NAME,
  };
};
