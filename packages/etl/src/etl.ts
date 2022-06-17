import * as ethers from 'ethers'

import { BlockGenerator } from './blockGenerator/blockGenerator'
import { withLock } from './db/locks'
import { process } from './processors/process'
import { registerProcessors } from './processors/register'
import { getInitialProcessorsState } from './processors/state'
import { getAllProcessors, SpockMultiChainConfig } from './services/config'
import { createServices } from './services/services'
import { Services } from './services/types'
import { statsWorker } from './stats/stats'
import { getLogger } from './utils/logger'
import { printSystemInfo } from './utils/printSystemInfo'

ethers.errors.setLogLevel('error')
const logger = getLogger('runner')

export async function etl(config: SpockMultiChainConfig): Promise<void> {
  const chainServices = await createServices(config)

  printSystemInfo(config)

  return startETL(chainServices)
}

export async function startETL(chainServices: Services[]): Promise<void> {
  // Begin processing for each chain service
  await Promise.all(
    chainServices.map((services, i) =>
      withLock(services.db, services.config.processDbLock + i, async () => {
        if (services.config.onStart) {
          logger.debug('Running onStart hook.')
          await services.config.onStart(services)
        }

        await registerProcessors(services, getAllProcessors(services.config))

        const blockGenerator = new BlockGenerator(services)
        await blockGenerator.init()

        await Promise.all([
          blockGenerator.run(services.config.startingBlock, services.config.lastBlock),
          process(services, services.config.extractors),
          process(services, services.config.transformers),
          services.config.statsWorker.enabled ? statsWorker(services) : Promise.resolve(),
        ])

        await blockGenerator.deinit()
      }),
    ),
  )
}
