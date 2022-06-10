import * as ethers from 'ethers'

import { BlockGenerator } from './blockGenerator/blockGenerator'
import { withLock } from './db/locks'
import { process } from './processors/process'
import { registerProcessors } from './processors/register'
import { getInitialProcessorsState } from './processors/state'
import { getAllProcessors, SpockConfig } from './services/config'
import { createServices } from './services/services'
import { Services } from './services/types'
import { statsWorker } from './stats/stats'
import { getLogger } from './utils/logger'
import { printSystemInfo } from './utils/printSystemInfo'

ethers.errors.setLogLevel('error')
const logger = getLogger('runner')

export async function etl(config: SpockConfig): Promise<void> {
  const services = await createServices(config)

  printSystemInfo(config)

  return startETL(services as Services) // TODO fix this type error with Partial
}

export async function startETL(services: Services): Promise<void> {
  await withLock(services.db, services.config.processDbLock, async () => {
    if (services.config.onStart) {
      logger.debug('Running onStart hook.')
      await services.config.onStart(services)
    }

    const mainnetServices = {
      ...services,
      //@ts-ignore
      config: { ...services.config, ...services.config.mainnet },
      provider: services.providerService.mainnet.provider,
      networkState: services.providerService.mainnet.networkState,
      tableSchema: services.providerService.mainnet.tableSchema,
      columnSets: services.columnSetsMainnet,
    }
    // mainnetServices.db.columnSets =  services.db.columnSetsMainnet;

    const arbitrumServices = {
      ...services,
      //@ts-ignore
      config: { ...services.config, ...services.config.arbitrum },
      provider: services.providerService.arbitrum.provider,
      networkState: services.providerService.arbitrum.networkState,
      tableSchema: services.providerService.arbitrum.tableSchema,
      columnSets: services.columnSetsArbitrum,
    }

    const mainnetProcessorsState = getInitialProcessorsState(getAllProcessors(mainnetServices.config))
    const arbitrumProcessorsState = getInitialProcessorsState(getAllProcessors(arbitrumServices.config))

    mainnetServices.processorsState = mainnetProcessorsState
    arbitrumServices.processorsState = arbitrumProcessorsState

    await registerProcessors(mainnetServices, getAllProcessors(mainnetServices.config))
    await registerProcessors(arbitrumServices, getAllProcessors(arbitrumServices.config))

    const blockGenerator = new BlockGenerator(mainnetServices)
    await blockGenerator.init()

    const arbitrumBlockGenerator = new BlockGenerator(arbitrumServices)
    await arbitrumBlockGenerator.init()

    await Promise.all([
      blockGenerator.run(mainnetServices.config.startingBlock, services.config.lastBlock), //fix this last block thing
      arbitrumBlockGenerator.run(arbitrumServices.config.startingBlock, services.config.lastBlock),
      process(mainnetServices, mainnetServices.config.extractors),
      process(mainnetServices, mainnetServices.config.transformers),
      process(arbitrumServices, arbitrumServices.config.extractors),
      process(arbitrumServices, arbitrumServices.config.transformers),
      mainnetServices.config.statsWorker.enabled ? statsWorker(mainnetServices) : Promise.resolve(),
      arbitrumServices.config.statsWorker.enabled ? statsWorker(arbitrumServices) : Promise.resolve(),
    ])

    await blockGenerator.deinit()
    await arbitrumBlockGenerator.deinit()
  })
}
