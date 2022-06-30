import { Provider } from 'ethers/providers'
import { assert } from 'ts-essentials'

import { createDB, DbContext } from '../db/db'
import { getNetworkState } from '../ethereum/getNetworkState'
import { RetryProvider } from '../ethereum/RetryProvider'
import { getInitialProcessorsState } from '../processors/state'
import { getAllProcessors, SpockConfig } from './config'
import { Services, TransactionalServices } from './types'

export async function createServices(config: SpockConfig, db: DbContext): Promise<Services> {
  const processorSchema = config.processorSchema
  const extractedSchema = config.extractedSchema
  const columnSets = db.getColumnSetsForChain(processorSchema, extractedSchema)

  const provider = createProvider(config.chain.host, config.chain.retries)
  const networkState = await getNetworkState(provider)
  const processorsState = getInitialProcessorsState(getAllProcessors(config))
  const services: Services = {
    ...db,
    config,
    provider,
    networkState,
    processorSchema,
    columnSets,
    processorsState,
  }

  return services
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
