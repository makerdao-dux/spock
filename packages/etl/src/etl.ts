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
  const chainServices = await createServices(config)

  printSystemInfo(config)

  return startETL(chainServices)
}

export async function startETL(chainServices: Services[]): Promise<void> {
  const [primaryService] = chainServices

  await withLock(primaryService.db, primaryService.config.processDbLock, async () => {
    //TODO refactor this to work with chainServices
    if (primaryService.config.onStart) {
      logger.debug('Running onStart hook.')
      await primaryService.config.onStart(primaryService)
    }

    // Register the processors for each chain service
    await Promise.all(
      chainServices.map(async (s) => {
        await registerProcessors(s, getAllProcessors(s.config))
      }),
    )

    // Create block generators for each chain service
    const blockGenerators = chainServices.map((s) => {
      const blockGenerator = new BlockGenerator(s)
      return blockGenerator
    })

    // Initialize each block generator
    await Promise.all(
      blockGenerators.map(async (bg) => {
        await bg.init()
      }),
    )

    // Begin processing for each chain service
    const promises = chainServices.map((s, i) => {
      return (
        blockGenerators[i].run(s.config.startingBlock, s.config.lastBlock), // note this might be a bug: primaryServce.config.lastBlock
        process(s, s.config.extractors),
        process(s, s.config.transformers),
        s.config.statsWorker.enabled ? statsWorker(s) : Promise.resolve()
      )
    })

    await Promise.all(promises.flat())

    // Shut down each block generator when finished
    await Promise.all(
      blockGenerators.map(async (blockGenerator, i) => {
        await blockGenerator.deinit()
      }),
    )
  })
}
