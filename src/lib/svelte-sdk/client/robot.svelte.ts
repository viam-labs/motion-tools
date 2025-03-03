/** Attach robot client from TS SDK to a context. */
import { getContext, setContext } from 'svelte'
import { deleteIn, getIn, setIn } from '@thi.ng/paths'
import { isEqual } from 'lodash-es'

import {
	type Client,
	createRobotClient as createClient,
	type DialConf,
	MachineConnectionEvent,
} from '@viamrobotics/sdk'

import { assertExists } from '../../assert'

const ROBOT_CLIENTS_CONTEXT_KEY = Symbol('robot-clients')

export type PartID = string

export interface RobotClientsContext {
	clients: Record<PartID, RobotClient>
	connectParts: (confs: Record<PartID, DialConf>) => void
}

const createRobotClientsContext = (): RobotClientsContext => {
	let clients = $state.raw<Record<PartID, RobotClient>>({})

	const connectParts = (dialConfs: Record<PartID, DialConf>) => {
		const nextClients = updateRobotClients(clients, dialConfs)
		if (nextClients !== clients) {
			clients = nextClients
		}
	}

	return {
		connectParts,
		get clients() {
			return clients
		},
	}
}

export class ClientNotConnectedError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'ClientNotConnectedError'
	}
}

export interface RobotClient {
	client: Client | undefined
	connectionStatus: MachineConnectionEvent
	connect: () => Promise<void>
	disconnect: () => Promise<void>
	setDialConf: (dialConf: DialConf) => Promise<void>
}

const createRobotClient = (): RobotClient => {
	let connectionStatus = $state<MachineConnectionEvent>(MachineConnectionEvent.DISCONNECTED)

	let current = $state.raw<Client>()
	let client = $state.raw<Client>()

	$effect(() => {
		current
		void connect()
		return () => {
			void disconnect()
		}
	})

	let dialConf: DialConf | undefined = undefined

	const handleConnectionStateChange = (event: unknown) => {
		connectionStatus = (event as { eventType: MachineConnectionEvent }).eventType
	}

	const disconnect = async () => {
		// If currently making the initial connection, abort it.
		if (dialConf?.reconnectAbortSignal !== undefined) {
			dialConf.reconnectAbortSignal.abort = true
		}

		if (!current) {
			return
		}

		const prev = current
		current = undefined
		client = current

		// Disconnect the client and stop listening to connection events
		prev.off('connectionstatechange', handleConnectionStateChange)
		await prev.disconnect()
	}

	const connect = async () => {
		if (!dialConf) {
			throw new Error('No dial config provided for creating robot client')
		}

		await disconnect()

		connectionStatus = MachineConnectionEvent.CONNECTING

		// Reset the abort signal if it exists
		if (dialConf.reconnectAbortSignal !== undefined) {
			dialConf.reconnectAbortSignal = {
				abort: false,
			}
		}

		try {
			// Connect the client and start listening to connection events
			current = await createClient(dialConf)
			current.on('connectionstatechange', handleConnectionStateChange)
			client = current
			connectionStatus = MachineConnectionEvent.CONNECTED
		} catch {
			connectionStatus = MachineConnectionEvent.DISCONNECTED
		}
	}

	const setDialConf = async (nextDialConf: DialConf) => {
		if (isEqual(nextDialConf, dialConf)) {
			return
		}
		dialConf = nextDialConf

		// If there is already a client and the dial config changed
		// then trigger a reconnect.
		if (current) {
			await connect()
		}
	}

	return {
		get client() {
			return client
		},
		get connectionStatus() {
			return connectionStatus
		},
		connect,
		disconnect,
		setDialConf,
	}
}

const updateRobotClients = (
	prevClients: Record<PartID, RobotClient>,
	dialConfs: Record<PartID, DialConf>
) => {
	let clients = prevClients

	// Connect to new dial confs and update the dial conf for existing ones
	for (const [partID, dialConf] of Object.entries(dialConfs)) {
		if (!clients[partID]) {
			clients = setIn(clients, [partID], createRobotClient())
		}
		const client = clients[partID]
		// This should always exist because we set it above if not.
		assertExists(client, 'Missing robot client')
		// Initialize the abort signal, which this context uses to abort initial connection
		dialConf.reconnectAbortSignal = {
			abort: false,
		}
		void client.setDialConf(dialConf)
	}

	// Disconnect from removed dial confs
	for (const [partID, client] of Object.entries(clients)) {
		if (!dialConfs[partID]) {
			void client.disconnect()
			clients = deleteIn(clients, [partID])
		}
	}

	return clients
}

export const provideRobotClientsContext = (context = createRobotClientsContext()) => {
	setContext<RobotClientsContext>(ROBOT_CLIENTS_CONTEXT_KEY, context)
	return context
}

export const useRobotClient = (partID: () => PartID) => {
	const context = getContext<RobotClientsContext | undefined>(ROBOT_CLIENTS_CONTEXT_KEY)

	assertExists(
		context,
		`useRobotClient called without access to a ${String(ROBOT_CLIENTS_CONTEXT_KEY)} context`
	)

	let client = $state<Client>()
	let connectionStatus = $state<MachineConnectionEvent>(MachineConnectionEvent.DISCONNECTED)
	let clientWrapped = $state<RobotClient>()

	// The record of clients is a readable, as well as each value in the record
	// contains a readable for each the client and connectionStatus.

	// Watch the RobotClient interface, it will go between undefined and defined
	// as DialConfs are provided.
	$effect(() => {
		if (!partID()) return

		clientWrapped = getIn(context.clients, [partID()])
	})

	$effect(() => {
		if (clientWrapped === undefined) {
			return
		}

		// If the interface exists, subscribe to the client which itself may be
		// undefined.
		if (clientWrapped.client !== client) {
			client = clientWrapped?.client
		}
	})

	$effect(() => {
		if (clientWrapped === undefined) {
			return
		}

		if (clientWrapped.connectionStatus !== connectionStatus) {
			connectionStatus = clientWrapped.connectionStatus
		}
	})

	return {
		get client() {
			return client
		},
		get connectionStatus() {
			return connectionStatus
		},
	}
}
