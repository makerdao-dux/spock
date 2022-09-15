import { Connection, makeNullUndefined } from '../db'

export interface ChainModel {
  id: number
  name: string
  chain_id: number
}
export type WritableChainModel = Omit<ChainModel, 'id'>

export async function getChain(c: Connection, chainName: string): Promise<ChainModel | undefined> {
  const getSQL = `
        SELECT * FROM chains.chain c
        WHERE c.name='${chainName}'
        `

  return await c.oneOrNone<ChainModel>(getSQL).then(makeNullUndefined)
}

export async function saveChain(c: Connection, chain: WritableChainModel): Promise<void> {
  const saveSQL = `
    INSERT INTO chains.chain(name, chain_id)
    VALUES('${chain.name}', ${chain.chain_id})
    `

  await c.none(saveSQL)
}
