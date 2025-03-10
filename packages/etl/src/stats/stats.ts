import { flatten, groupBy, pick, values } from 'lodash'

import { withConnection } from '../db/db'
import { getAllJobs, JobModel } from '../db/models/Job'
import { Services } from '../services/types'
import { getSpockBreakout } from '../utils/breakout'
import { getLogger } from '../utils/logger'
import { delay } from '../utils/promises'
import { printTimersSummary } from '../utils/timer'
import { Stats } from './types'

const logger = getLogger('stats')

export async function statsWorker(services: Services): Promise<void> {
  const statsCfg = services.config.statsWorker

  logger.info('Stats process starting...')

  let lastStat: Stats | undefined
  while (true && !getSpockBreakout()) {
    const startTime = Date.now()
    logger.info(`Sleeping for ${statsCfg.interval} sec...`)
    await delay(statsCfg.interval * 1000 * 60)
    logger.info('Calculating stats...')
    const stopTime = Date.now()

    const stats = await getStats(services)
    if (lastStat) {
      const blocksSyncedDelta = stats.blocksSynced - lastStat.blocksSynced
      const blocksExtractedDelta = stats.blocksExtracted - lastStat.blocksExtracted
      const blocksTransformedDelta = stats.blocksTransformed - lastStat.blocksTransformed
      const timeDeltaSec = (stopTime - startTime) / 1000

      logger.info(`
Stats on ${new Date(stopTime).toUTCString()}}:
synced: ${(blocksSyncedDelta / timeDeltaSec).toFixed(2)} blocks/sec
extracted: ${(blocksExtractedDelta / timeDeltaSec).toFixed(2)} tasks/sec
transformed: ${(blocksTransformedDelta / timeDeltaSec).toFixed(2)} tasks/sec
      `)
      printTimersSummary()
    } else {
      logger.info('Missing baseline')
    }

    lastStat = stats
  }
}

export async function getStats(services: Services): Promise<Stats> {
  return await withConnection(services.db, async (c) => {
    const blocksSynced =
      (
        (await c.oneOrNone(`SELECT id FROM ${services.processorSchema}.block ORDER BY number DESC LIMIT 1;
  `)) || {}
      ).id || 0
    const allJobs = await getAllJobs(c, services.processorSchema)
    const allJobsByName = groupBy(allJobs, 'name')

    const extractors = flatten(
      values(
        pick(
          allJobsByName,
          services.config.extractors.map((e) => e.name),
        ),
      ),
    )
    const blocksExtracted = sumWork(extractors)
    const transformers = flatten(
      values(
        pick(
          allJobsByName,
          services.config.transformers.map((e) => e.name),
        ),
      ),
    )
    const blocksTransformed = sumWork(transformers)

    return {
      blocksSynced,
      blocksExtracted,
      blocksTransformed,
    }
  })
}

function sumWork(job: JobModel[]): number {
  return job.reduce((a, c) => a + c.last_block_id, 0)
}
