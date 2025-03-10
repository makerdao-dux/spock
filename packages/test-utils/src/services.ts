import { createDB } from '@makerdao-dux/spock-etl/dist/db/db'
import { getNetworkState, NetworkState } from '@makerdao-dux/spock-etl/dist/ethereum/getNetworkState'
import { getInitialProcessorsState } from '@makerdao-dux/spock-etl/dist/processors/state'
import { getAllProcessors, getDefaultConfig, SpockConfig } from '@makerdao-dux/spock-etl/dist/services/config'
import { createProvider } from '@makerdao-dux/spock-etl/dist/services/services'
import { Services } from '@makerdao-dux/spock-etl/dist/services/types'
import { merge } from 'lodash'
import { DeepPartial } from 'ts-essentials'

import { prepareDB } from './db'

export async function createTestServices(services: Partial<Services> = {}): Promise<Services> {
  const config = services.config ?? getTestConfig()
  const dbCtx = createDB(config.db)
  await prepareDB(dbCtx.db, config)
  const provider = createProvider(config.chain.host, config.chain.retries)
  const networkState = config.chain.host ? await getNetworkState(provider) : dummyNetworkState

  const processorSchema = config.processorSchema
  const extractedSchema = config.extractedSchema
  const columnSets = dbCtx.getColumnSetsForChain(processorSchema, extractedSchema)

  return {
    ...dbCtx,
    config,
    provider,
    networkState,
    processorSchema,
    columnSets,
    processorsState: getInitialProcessorsState(getAllProcessors(config)),
    ...services,
  }
}

export async function destroyTestServices(services: Services): Promise<void> {
  await services.db.$pool.end()
}

export const dummyNetworkState: NetworkState = {
  latestEthereumBlockOnStart: 1,
  networkName: { name: 'test', chainId: 1337, ensAddress: '0x0' },
}

export function getTestConfig(customConfig: DeepPartial<SpockConfig> = {}): SpockConfig {
  return merge(
    {},
    getDefaultConfig({
      VL_DB_DATABASE: 'database',
      VL_DB_USER: 'user',
      VL_DB_PASSWORD: 'password',
      VL_DB_HOST: 'localhost',
      VL_DB_PORT: '5432',
      VL_CHAIN_HOST: '',
      VL_CHAIN_NAME: '',
    }),
    {
      blockGenerator: {
        batch: 2,
      },
      extractorWorker: {
        batch: 2,
        reorgBuffer: 10,
      },
      startingBlock: 0,
      processorsWorker: {
        retriesOnErrors: 1,
      },
      migrations: {},
      statsWorker: {
        enabled: false,
      },
      extractors: [],
      transformers: [],
    },
    customConfig,
  ) as any
}

export const networkState: NetworkState = {
  latestEthereumBlockOnStart: 1,
  networkName: { name: 'test', chainId: 1337, ensAddress: '0x0' },
}
