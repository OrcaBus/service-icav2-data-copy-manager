import {
  DEFAULT_COPY_JOB_SQS_NAME,
  DEFAULT_EVENT_PIPE_NAME,
  EVENT_BUS_NAME_EXTERNAL,
  EVENT_DETAIL_TYPE_EXTERNAL,
  EVENT_SOURCE,
  ICAV2_ACCESS_TOKEN_SECRET_ID,
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

    /* Slack topic stuff */
    slackTopicName: 'AwsChatBotTopic',

    /* Add in the sqs queue name for the internal jobs */
    copyJobSqsQueueName: DEFAULT_COPY_JOB_SQS_NAME,
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
    externalEventBusName: EVENT_BUS_NAME_EXTERNAL,
    eventDetailType: EVENT_DETAIL_TYPE_EXTERNAL,
    eventSource: EVENT_SOURCE,
    icaEventPipeName: DEFAULT_EVENT_PIPE_NAME,

    /* Sqs Stuff */
    copyJobQueueName: DEFAULT_COPY_JOB_SQS_NAME,
  };
};
