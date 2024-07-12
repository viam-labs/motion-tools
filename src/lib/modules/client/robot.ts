/** Attach robot client from TS SDK to a context. */
import { getContext, setContext } from 'svelte';
import { derived, type Readable, writable } from 'svelte/store';
import { deleteIn, getIn, setIn } from '@thi.ng/paths';
import { type CurrentWritable, currentWritable, watch } from '@threlte/core';
import { isEqual } from 'lodash-es';

import {
  type Client,
  createRobotClient as createClient,
  type DialConf,
  MachineConnectionEvent,
} from '@viamrobotics/sdk';

import { assertExists } from '../assert';

const ROBOT_CLIENTS_CONTEXT_KEY = Symbol('robot-clients');

export type PartID = string;

export interface RobotClientsContext {
  clients: CurrentWritable<Record<PartID, RobotClient>>;
  connectParts: (confs: Record<PartID, DialConf>) => void;
}

const createRobotClientsContext = (): RobotClientsContext => {
  const clients = currentWritable<Record<PartID, RobotClient>>({});

  const connectParts = (dialConfs: Record<PartID, DialConf>) => {
    const nextClients = updateRobotClients(clients.current, dialConfs);
    if (nextClients !== clients.current) {
      clients.set(nextClients);
    }
  };

  return {
    clients,
    connectParts,
  };
};

export interface RobotClient {
  client: Readable<Client | undefined>;
  connectionStatus: Readable<MachineConnectionEvent>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setDialConf: (dialConf: DialConf) => Promise<void>;
}

const createRobotClient = (): RobotClient => {
  const connectionStatus = writable<MachineConnectionEvent>(
    MachineConnectionEvent.DISCONNECTED
  );

  // Can't use CurrentWritable here because it doesn't accept a
  // start function parameter, which we need for clean up.
  let current: Client | undefined = undefined;
  const client = writable<Client | undefined>(current, () => {
    void connect();

    return () => {
      void disconnect();
    };
  });
  let dialConf: DialConf | undefined = undefined;

  const handleConnectionStateChange = (event: unknown) => {
    const next = (event as { eventType: MachineConnectionEvent }).eventType;
    connectionStatus.set(next);
  };

  const disconnect = async () => {
    if (!current) {
      return;
    }

    const prev = current;
    current = undefined;
    client.set(current);

    // Disconnect the client and stop listening to connection events
    prev.off('connectionstatechange', handleConnectionStateChange);
    await prev.disconnect();
  };

  const connect = async () => {
    if (!dialConf) {
      throw new Error('No dial config provided for creating robot client');
    }

    await disconnect();

    connectionStatus.set(MachineConnectionEvent.CONNECTING);

    try {
      // Connect the client and start listening to connection events
      current = await createClient(dialConf);
      current.on('connectionstatechange', handleConnectionStateChange);
      client.set(current);
      connectionStatus.set(MachineConnectionEvent.CONNECTED);
    } catch {
      connectionStatus.set(MachineConnectionEvent.DISCONNECTED);
    }
  };

  const setDialConf = async (nextDialConf: DialConf) => {
    if (isEqual(nextDialConf, dialConf)) {
      return;
    }
    dialConf = nextDialConf;

    // If there is already a client and the dial config changed
    // then trigger a reconnect.
    if (current) {
      await connect();
    }
  };

  return {
    client: { subscribe: client.subscribe },
    connectionStatus: { subscribe: connectionStatus.subscribe },
    connect,
    disconnect,
    setDialConf,
  };
};

const updateRobotClients = (
  prevClients: Record<PartID, RobotClient>,
  dialConfs: Record<PartID, DialConf>
) => {
  let clients = prevClients;

  // Connect to new dial confs and update the dial conf for existing ones
  for (const [partID, dialConf] of Object.entries(dialConfs)) {
    if (!clients[partID]) {
      clients = setIn(clients, [partID], createRobotClient());
    }
    const client = clients[partID];
    // This should always exist because we set it above if not.
    assertExists(client, 'Missing robot client');
    void client.setDialConf(dialConf);
  }

  // Disconnect from removed dial confs
  for (const [partID, client] of Object.entries(clients)) {
    if (!dialConfs[partID]) {
      void client.disconnect();
      clients = deleteIn(clients, [partID]);
    }
  }

  return clients;
};

export const provideRobotClientsContext = (
  context = createRobotClientsContext()
) => {
  setContext<RobotClientsContext>(ROBOT_CLIENTS_CONTEXT_KEY, context);
  return context.connectParts;
};

export const useRobotClient = (partID: Readable<PartID>) => {
  const context = getContext<RobotClientsContext | undefined>(
    ROBOT_CLIENTS_CONTEXT_KEY
  );

  assertExists(
    context,
    `useRobotClient called without access to a ${String(
      ROBOT_CLIENTS_CONTEXT_KEY
    )} context`
  );

  const client = currentWritable<Client | undefined>(undefined);
  const connectionStatus = currentWritable<MachineConnectionEvent>(
    MachineConnectionEvent.DISCONNECTED
  );

  // The record of clients is a readable, as well as each value in the record
  // contains a readable for each the client and connectionStatus.

  // First derive the RobotClient interface, which may or may not exist in the
  // record.
  const clientWrapped = derived(
    [partID, context.clients],
    ([$partID, $clients]): RobotClient | undefined => getIn($clients, [$partID])
  );

  // Watch the RobotClient interface, it will go between undefined and defined
  // as DialConfs are provided.
  watch(clientWrapped, ($clientWrapped) => {
    // If the interface exists, subscribe to the client which itself may be
    // undefined.
    const unsubClient = $clientWrapped?.client.subscribe(($client) => {
      if ($client !== client.current) {
        client.set($client);
      }
    });
    // If the interface exists, subscribe to the connection status of the
    // client.
    const unsubConnectionStatus = $clientWrapped?.connectionStatus.subscribe(
      ($connectionStatus) => {
        if ($connectionStatus !== connectionStatus.current) {
          connectionStatus.set($connectionStatus);
        }
      }
    );

    // Clean up subscriptions when the values change.
    return () => {
      unsubClient?.();
      unsubConnectionStatus?.();
    };
  });

  return {
    client: { subscribe: client.subscribe },
    connectionStatus: { subscribe: connectionStatus.subscribe },
  };
};
