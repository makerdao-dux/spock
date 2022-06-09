-- copied from 012
-- processing - everything is fine
-- stopped - error occured, job stopped
-- not-ready - not part of the current config

-- job_status already exists, so we don't need to recreate it
-- CREATE TYPE job_status AS ENUM ('processing', 'stopped', 'not-ready');

ALTER TABLE vulcan2xArbitrum.job 
  ADD status job_status not null default 'not-ready',
  ADD extra_info text;


-- copied from 013
-- DROP old, not used anymore tables

DROP TABLE vulcan2xArbitrum.extracted_block;
DROP TABLE vulcan2xArbitrum.transformed_block;
DROP TABLE vulcan2xArbitrum.done_job;
