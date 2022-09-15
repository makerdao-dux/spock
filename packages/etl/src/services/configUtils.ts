import { mapValues, merge } from 'lodash'
import { dirname, isAbsolute, join } from 'path'
import { Dictionary } from 'ts-essentials'

import { loadExternalModule } from '../utils/modules'
import { getDefaultConfig, SpockConfig, spockConfigSchema } from './config'

export function loadConfig(externalConfigPath: string): SpockConfig[] {
  // Here we'll have an array of one or more configs:
  const configModule = loadExternalModule(externalConfigPath)

  if (!Array.isArray(configModule)) {
    throw new Error(`User-config must be passsed as an array!`)
  }

  const mergedConfigs = configModule.map((cfg: any) => {
    const externalCfg = fixConfigPaths(externalConfigPath, cfg)
    const mergedConfig = mergeConfig(externalCfg)
    return mergedConfig
  })

  return mergedConfigs
}

export function mergeConfig(externalCfg: any): SpockConfig {
  const defaultCfg = getDefaultConfig(process.env)

  const finalConfig = merge({}, defaultCfg, externalCfg) as any
  return spockConfigSchema.parse(finalConfig)
}

/**
 * Turn any relative paths in the config to absolute ones
 */
function fixConfigPaths(configPath: string, config: any): any {
  const newMigrations = mapValues(config.migrations, (path) => {
    if (isAbsolute(path)) {
      return path
    } else {
      return join(dirname(configPath), path)
    }
  })

  config.migrations = newMigrations

  return config
}

export function getRequiredString(env: Env, name: string): string {
  const value = env[name]
  if (value === undefined) {
    throw new Error(`Required env var ${name} missing`)
  }

  return value
}

export function getRequiredNumber(env: Env, name: string): number {
  const string = getRequiredString(env, name)
  const number = parseInt(string)
  if (isNaN(number)) {
    throw new Error(`Couldn't parse ${name} as number`)
  }

  return number
}

export type Env = Dictionary<string | undefined>
