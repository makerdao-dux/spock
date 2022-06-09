import pg from 'pg-promise'
import { IConnectionParameters } from 'pg-promise/typescript/pg-subset'
import { TableSchema } from '../services/types'

import { getLogger } from '../utils/logger'

const logger = getLogger('db')

export type DB = pg.IDatabase<{}>
export type DbConnection = pg.IConnected<{}, any>
export type DbTransactedConnection = pg.ITask<{}>
export type ColumnSets = ReturnType<typeof getColumnSets>
export type Connection = DbConnection | DbTransactedConnection

export function createDB(
  config: IConnectionParameters,
): { db: DB; pg: pg.IMain; columnSetsMainnet: ColumnSets; columnSetsArbitrum: ColumnSets } {
  const PgClient = pg({
    receive: (_data, res, e) => {
      // avoid clutter in output
      if (e.query === 'begin' || e.query === 'commit') {
        return
      }

      logger.trace(`${e.query} (${res.duration} ms)`)
      if ((res.duration || 0) / 1000 > 5) {
        logger.warn(`SLOW QUERY DETECTED! TOOK: ${res.duration} ms`, e.query)
      }
    },
  })

  return {
    pg: PgClient,
    db: PgClient({ ...config }),
    columnSetsMainnet: getColumnSets(PgClient, 'vulcan2x'),
    columnSetsArbitrum: getColumnSets(PgClient, 'vulcan2xArbitrum'),
  }
}

export async function withConnection<T>(db: DB, action: (connection: DbConnection) => Promise<T>): Promise<T> {
  let connection: DbConnection | undefined
  try {
    connection = await db.connect()

    return await action(connection)
  } finally {
    if (connection) {
      connection.done()
    }
  }
}

export function makeNullUndefined<T>(value: T | null): T | undefined {
  if (value === null) {
    return undefined
  }

  return value
}

export function getColumnSets(pg: pg.IMain, schema: TableSchema) {
  const extracted = schema === 'vulcan2x' ? 'extracted' : 'extractedArbitrum'
  return {
    block: new pg.helpers.ColumnSet(['number', 'hash', 'timestamp'], {
      table: new pg.helpers.TableName({ table: 'block', schema }),
    }),
    extracted_logs: new pg.helpers.ColumnSet(['block_id', 'tx_id', 'log_index', 'address', 'data', 'topics'], {
      table: new pg.helpers.TableName({ table: 'logs', schema: extracted }),
    }),
  }
}
