import { Provider } from 'ethers/providers'

import { createDB } from '../db/db'
import { getNetworkState } from '../ethereum/getNetworkState'
import { RetryProvider } from '../ethereum/RetryProvider'
import { getInitialProcessorsState } from '../processors/state'
import { getAllProcessors, SpockConfig } from './config'
import { ProviderManager, ProviderService, Services, TransactionalServices } from './types'

export async function createServices(config: SpockConfig): Promise<Partial<Services>> {
  const db = createDB(config.db)
  const providerService = await createProvider(config)
  // const networkState = await getNetworkState(provider)
  // const processorsState = getInitialProcessorsState(getAllProcessors(config))

  return {
    providerService,
    // provider,
    ...db,
    config,
    // networkState,
    // processorsState,
  }
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

export async function createProvider(config: SpockConfig): Promise<ProviderService> {
  const mainnetProvider = new RetryProvider(config.chain.mainnet.host, config.chain.mainnet.retries)
  const mainnetNetworkState = await getNetworkState(mainnetProvider)
  const arbitrumProvider = new RetryProvider(config.chain.arbitrum.host, config.chain.arbitrum.retries)
  const arbitrumNetworkState = await getNetworkState(mainnetProvider)
  const mainnet = {
    provider: mainnetProvider,
    networkState: mainnetNetworkState,
    tableSchema: 'vulcan2x',
  } as ProviderManager<'mainnet'>

  const arbitrum = {
    provider: arbitrumProvider,
    networkState: arbitrumNetworkState,
    tableSchema: 'vulcan2xarbitrum',
  } as ProviderManager<'arbitrum'>

  const getProvider = (chain: string) =>
    chain === 'mainnet'
      ? mainnet
      : chain === 'arbitrum'
      ? arbitrum
      : (function () {
          throw new Error(`Provider for ${chain} not found`)
        })()
  return { mainnet, arbitrum, getProvider }
}
