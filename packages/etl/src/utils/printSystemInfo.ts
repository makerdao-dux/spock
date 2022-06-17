import { omit } from 'lodash'

import { SpockMultiChainConfig } from '../services/config'
import { getLogger } from './logger'

const logger = getLogger('system')

export function printSystemInfo(config: SpockMultiChainConfig): void {
  logger.info(`Starting Spock ETL ver.${getVersion()}`)
  logger.info('Config:', maskConfig(config))
}

function maskConfig(config: SpockMultiChainConfig): Record<string, any> {
  const chains = Object.keys(config.chain)
  return {
    ...omit(config, 'sentry', 'onStart'),
    // avoid printing out password
    db: {
      host: config.db.host,
    },
  }
}

export function getVersion(): string {
  return (require('../../package.json') || {}).version
}
