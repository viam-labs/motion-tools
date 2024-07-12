import { readable } from 'svelte/store';
import { currentWritable } from '@threlte/core';
import { noop } from 'lodash-es';

import type { MachineConnectionEvent } from '@viamrobotics/sdk';

import {
  type PartID,
  provideRobotClientsContext,
  type RobotClient,
} from '../../client';

export const provideNoopRobotClientsContext = ({
  partID,
  status,
}: {
  partID: PartID;
  status: MachineConnectionEvent;
}) => {
  const client = {
    client: readable(),
    connectionStatus: readable(status),
    connect: noop,
    disconnect: noop,
    setDialConf: noop,
  } as RobotClient;

  const clients = currentWritable({
    [partID]: client,
  });

  provideRobotClientsContext({ clients, connectParts: noop });
};
