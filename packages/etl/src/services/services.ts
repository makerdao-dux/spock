import { Provider } from 'ethers/providers'
import { assert } from 'ts-essentials'

import { createDB } from '../db/db'
import { getNetworkState } from '../ethereum/getNetworkState'
import { RetryProvider } from '../ethereum/RetryProvider'
import { getInitialProcessorsState } from '../processors/state'
import { getAllProcessors, SpockConfig } from './config'
import { ProviderManager, ProviderService, Services, SupportedChains, TransactionalServices } from './types'

export async function createServices(config: SpockConfig): Promise<Services[]> {
  const db = createDB(config.db)
  const providerService = await createProvider(config)
  // const networkState = await getNetworkState(provider)
  // const processorsState = getInitialProcessorsState(getAllProcessors(config))

  // If running multiple chains
  if ('chain' in config) {
    const chains = Object.keys(config.chain)
    const chainServices = chains.map((chain) => {
      // assert(Object.keys(SUPPORTED_CHAINS).includes(chain), `${chain} is not a supported chain`)
      // TODO better validation & typing here:
      const providerManager = providerService.getProvider(chain as SupportedChains)
      const columnSets = db.getColumnSetsForChain(providerManager.tableSchema)

      const serv: Services = {
        ...db,
        //@ts-ignore //fixme
        config: { ...config, ...config.chain[chain] },
        provider: providerManager.provider,
        networkState: providerManager.networkState,
        tableSchema: providerManager.tableSchema, //why is this on provider service?
        columnSets,
        processorsState: getInitialProcessorsState(
          //@ts-ignore //fixme
          getAllProcessors({ ...config.chain[chain] }),
        ),
      }
      return serv
    })
    return chainServices
  }

  // FIXME I can't believe he's done this!
  return {} as Services[]
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
