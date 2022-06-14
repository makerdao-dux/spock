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

    const multServices: Services[] = [mainnetServices, arbitrumServices]

    await Promise.all(
      multServices.map(async (s) => {
        await registerProcessors(s, getAllProcessors(s.config))
      }),
    )

    const bGens = multServices.map((s) => {
      const blockGenerator = new BlockGenerator(s)
      return blockGenerator
    })

    await Promise.all(
      bGens.map(async (bg) => {
        await bg.init()
      }),
    )

    await Promise.all(
      multServices.map(async (s, i) => {
        await bGens[i].run(s.config.startingBlock, services.config.lastBlock), // note this might be a bug: services.config.lastBlock
          await process(s, s.config.extractors),
          await process(s, s.config.transformers),
          await (s.config.statsWorker.enabled ? statsWorker(s) : Promise.resolve())
      }),
    )

    await Promise.all(
      bGens.map(async (blockGenerator, i) => {
        await blockGenerator.deinit()
      }),
    )
  })
}
