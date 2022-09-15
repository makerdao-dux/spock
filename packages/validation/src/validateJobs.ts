/**
 * Script to checks if all jobs are still running
 */
import { createDB, withConnection } from '@makerdao-dux/spock-etl/dist/db/db'
import { getAllJobs } from '@makerdao-dux/spock-etl/dist/db/models/Job'
import { SpockConfig } from '@makerdao-dux/spock-etl/dist/services/config'
import { createServices } from '@makerdao-dux/spock-etl/dist/services/services'
import { getLogger } from '@makerdao-dux/spock-etl/dist/utils/logger'

const logger = getLogger('validate-jobs')

export async function validateJobs(config: SpockConfig): Promise<void> {
  logger.info(`Running...`)

  const dbCtx = createDB(config.db)

  const spockServices = await createServices(config, dbCtx)

  await withConnection(spockServices.db, async (c) => {
    const jobs = await getAllJobs(c, config.processorSchema)
    logger.info(`All jobs: ${jobs.length}`)

    const stoppedJobs = jobs.filter((j) => j.status === 'stopped')

    logger.info(`Stopped jobs: ${stoppedJobs.length}`)
    if (stoppedJobs.length > 0) {
      logger.info(`Detected stopped jobs! Failing!`)
      process.exit(1)
    }
  })
}
