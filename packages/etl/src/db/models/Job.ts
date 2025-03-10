import { Connection, makeNullUndefined } from '../db'

export interface JobModel {
  id: number
  name: string
  last_block_id: number
  status: JobStatus
  extra_info?: string
}

export type JobStatus = 'processing' | 'stopped' | 'not-ready'

export type WritableJobModel = Omit<JobModel, 'id'>

export async function saveJob(c: Connection, job: WritableJobModel, schema: string): Promise<void> {
  const saveSQL = `
  INSERT INTO ${schema}.job(name, last_block_id, status)
  VALUES('${job.name}', ${job.last_block_id}, '${job.status}')
  `

  await c.none(saveSQL)
}

export async function getJob(c: Connection, jobName: string, schema: string): Promise<JobModel | undefined> {
  const getSQL = `
      SELECT * FROM ${schema}.job j
      WHERE j.name='${jobName}'
      `

  return await c.oneOrNone<JobModel>(getSQL).then(makeNullUndefined)
}

export async function getAllJobs(c: Connection, schema: string): Promise<JobModel[]> {
  const countJobsDoneSQL = `
  SELECT * FROM ${schema}.job;
  `
  const jobs = await c.many<JobModel>(countJobsDoneSQL)

  return jobs
}

export async function setJobStatus(c: Connection, job: JobModel, newStatus: JobStatus, schema: string): Promise<void> {
  const sql = `
    UPDATE ${schema}.job
    SET status=\${newStatus}, extra_info=NULL
    WHERE name=\${jobName}
  `

  await c.none(sql, { newStatus, jobName: job.name })
}

export async function stopJob(c: Connection, jobName: string, extraInfo: string, schema: string): Promise<void> {
  const sql = `
    UPDATE ${schema}.job
    SET status='stopped', extra_info=\${extraInfo}
    WHERE name=\${jobName}
  `

  await c.none(sql, { extraInfo, jobName })
}

export async function excludeAllJobs(c: Connection, schema: string): Promise<void> {
  const sql = `
    UPDATE ${schema}.job
    SET status='not-ready';
  `

  await c.none(sql)
}
