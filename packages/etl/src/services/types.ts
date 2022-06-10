import { Provider } from 'ethers/providers'
import pgPromise from 'pg-promise'
import { StrictOmit } from 'ts-essentials'

import { ColumnSets, DB, DbTransactedConnection } from '../db/db'
import { NetworkState } from '../ethereum/getNetworkState'
import { ProcessorsState } from '../processors/state'
import { SpockConfig } from './config'

export type TableSchema = 'vulcan2x' | 'vulcan2xarbitrum'

export type SupportedChains = 'mainnet' | 'arbitrum'
export interface ProviderManager<T> {
  provider: Provider
  networkState: NetworkState
  tableSchema: TableSchema
}
export interface ProviderService {
  mainnet: ProviderManager<'mainnet'>
  arbitrum: ProviderManager<'arbitrum'>
  getProvider: (chain: SupportedChains) => ProviderManager<SupportedChains>
}

export interface Services {
  providerService: ProviderService
  provider: Provider
  db: DB
  pg: pgPromise.IMain
  config: SpockConfig
  columnSets: ColumnSets
  columnSetsMainnet: ColumnSets
  columnSetsArbitrum: ColumnSets
  networkState: NetworkState
  processorsState: ProcessorsState
  tableSchema: TableSchema
}

export interface TransactionalServices extends StrictOmit<Services, 'db'> {
  tx: DbTransactedConnection
}

// No external data sources like blockchain
export type LocalServices = Omit<TransactionalServices, 'provider'>
