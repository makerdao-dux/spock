import { Provider } from 'ethers/providers'
import { assert } from 'ts-essentials'

import { createDB } from '../db/db'
import { getNetworkState } from '../ethereum/getNetworkState'
import { RetryProvider } from '../ethereum/RetryProvider'
import { getInitialProcessorsState } from '../processors/state'
import { getAllProcessors, SpockConfig } from './config'
import { Services, TransactionalServices } from './types'

export async function createServices(config: SpockConfig): Promise<Services[]> {
  const db = createDB(config.db)

  const chains = Object.keys(config.chain)
  const chainServices = chains.map(async (chain) => {
    // TODO better validation & typing here:
    //@ts-ignore //fixme
    const processorSchema = config.chain[chain].processorSchema
    //@ts-ignore //fixme
    const extractedSchema = config.chain[chain].extractedSchema
    console.log('schemas to use', processorSchema, extractedSchema)
    const columnSets = db.getColumnSetsForChain(processorSchema, extractedSchema)

    //@ts-ignore //fixme
    const provider = createProvider(config.chain[chain].host, config.chain[chain].retries)
    const networkState = await getNetworkState(provider)

    const serv: Services = {
      ...db,
      //@ts-ignore //fixme
      config: { ...config, ...config.chain[chain] },
      provider,
      networkState,
      processorSchema,
      columnSets,
      processorsState: getInitialProcessorsState(
        //@ts-ignore //fixme
        getAllProcessors({ ...config.chain[chain] }),
      ),
    }
    return serv
  })
  return await Promise.all(chainServices)
}

export async function withTx<T>(services: Services, op: (tx: TransactionalServices) => Promise<T>): Promise<T> {
  return await services.db.tx(async (tx) => {
    const txServices: TransactionalServices = {
      ...services,
      tx,
    }

    return await op(txServices)
  })
}

export function createProvider(url: string, retries: number): Provider {
  return new RetryProvider(url, retries)
}
