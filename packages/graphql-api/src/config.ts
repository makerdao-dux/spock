import { Env, getRequiredNumber, getRequiredString } from '@makerdao-dux/spock-etl/dist/services/configUtils'
import { loadExternalModule } from '@makerdao-dux/spock-etl/dist/utils/modules'
import { get, merge } from 'lodash'
import { dirname, join } from 'path'

export interface ApiConfig {
  api: {
    whitelisting: {
      enabled: boolean
      whitelistedQueriesDir?: string
      bypassSecret?: string
    }
    responseCaching: {
      enabled: boolean
      duration: string
      transformKey: (key: string) => string
    }
    port: number
  }
  db: {
    database: string
    user: string
    password: string
    host: string
    port: number
  }
}

export function getConfig(env: Env, configPath: string): ApiConfig {
  // Here we'll have an array of one or more configs:
  const configs = loadExternalModule(configPath)
  // The config module passed to this function is an array of two config objects,
  // the API and DB settings should be shared between all configs, so just pick the first.
  const [config] = configs

  const externalConfig = fixConfigPaths(configPath, config)

  const defaultCfg: ApiConfig = {
    db: {
      database: getRequiredString(env, 'VL_DB_DATABASE'),
      user: getRequiredString(env, 'VL_DB_USER'),
      password: getRequiredString(env, 'VL_DB_PASSWORD'),
      host: getRequiredString(env, 'VL_DB_HOST'),
      port: getRequiredNumber(env, 'VL_DB_PORT'),
    },
    api: {
      port: 3001,
      whitelisting: {
        enabled: !!process.env.VL_GRAPHQL_WHITELISTING_ENABLED,
      },
      responseCaching: {
        enabled: !!process.env.VL_GRAPHQL_CACHING_ENABLED,
        duration: process.env.VL_GRAPHQL_CACHING_DURATION || '15 seconds',
        transformKey: (k) => k,
      },
    },
  }

  return merge({}, defaultCfg, externalConfig)
}

/**
 * Turn any relative paths in the config to absolute ones
 */
function fixConfigPaths(configPath: string, config: any): any {
  const whitelistedQueriesDir = get(config, 'api.whitelisting.whitelistedQueriesDir')
  const newWhitelistedQueriesDir = whitelistedQueriesDir && join(dirname(configPath), whitelistedQueriesDir)

  if (!config.api) {
    config.api = {}
  }
  if (!config.api.whitelisting) {
    config.api.whitelisting = {}
  }
  config.api.whitelisting.whitelistedQueriesDir = newWhitelistedQueriesDir

  return config
}
