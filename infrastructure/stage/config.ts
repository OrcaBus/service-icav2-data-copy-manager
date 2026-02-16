import {
  DEFAULT_EVENT_PIPE_NAME,
  EVENT_BUS_NAME_EXTERNAL,
  EVENT_BUS_NAME_INTERNAL,
  EVENT_DETAIL_TYPE_EXTERNAL,
  EVENT_SOURCE,
  ICAV2_ACCESS_TOKEN_SECRET_ID,
  INTERNAL_EVENT_BUS_DESCRIPTION,
  TABLE_NAME,
  TABLE_REMOVAL_POLICY,
} from './constants';
import { StatefulApplicationStackConfig, StatelessApplicationStackConfig } from './interfaces';
import { StageName } from '@orcabus/platform-cdk-constructs/shared-config/accounts';
import {
  DEFAULT_HOSTNAME_SSM_PARAMETER,
  DEFAULT_ORCABUS_TOKEN_SECRET_ID,
} from '@orcabus/platform-cdk-constructs/lambda/config';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getStatefulStackProps = (stage: StageName): StatefulApplicationStackConfig => {
  return {
    /* Table stuff */
    tableName: TABLE_NAME,
    tableRemovalPolicy: TABLE_REMOVAL_POLICY,

    /* Event Bus stuff */
    internalEventBusName: EVENT_BUS_NAME_INTERNAL,
    internalEventBusDescription: INTERNAL_EVENT_BUS_DESCRIPTION,

    /* Slack topic stuff */
    slackTopicName: 'AwsChatBotTopic',
  };
};

export const getStatelessStackProps = (stage: StageName): StatelessApplicationStackConfig => {
  return {
    /* Stage name */
    stageName: stage,
    /* Table name */
    tableName: TABLE_NAME,

    /* Secrets */
    icav2AccessTokenSecretId: ICAV2_ACCESS_TOKEN_SECRET_ID[stage],
    orcabusTokenSecretId: DEFAULT_ORCABUS_TOKEN_SECRET_ID,
    hostnameSsmParameterName: DEFAULT_HOSTNAME_SSM_PARAMETER,

    /* Event stuff */
    internalEventBusName: EVENT_BUS_NAME_INTERNAL,
    externalEventBusName: EVENT_BUS_NAME_EXTERNAL,
    eventDetailType: EVENT_DETAIL_TYPE_EXTERNAL,
    eventSource: EVENT_SOURCE,
    icaEventPipeName: DEFAULT_EVENT_PIPE_NAME,
  };
};
