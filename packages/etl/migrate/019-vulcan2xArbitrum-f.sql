--copied from 010
CREATE TABLE vulcan2xArbitrum.done_job (
  id             serial primary key,
  -- ranges are inclusive
  start_block_id integer not null,
  end_block_id   integer not null,

  -- name can be both extractor or transformer
  name character varying(100) not null,
  unique (start_block_id, end_block_id, name)
);
CREATE INDEX vulcan2xArbitrum_done_job_extractor_name ON vulcan2xArbitrum.done_job(name);


-- missing index for block hash
CREATE INDEX vulcan2xArbitrum_block_hash_index ON vulcan2xArbitrum.block(hash);

-- copied from 011
CREATE TABLE vulcan2xArbitrum.job (
  id             serial primary key,
  -- name can be both extractor or transformer
  name character varying(100) not null,
  last_block_id   integer not null,

  unique (name)
);
CREATE INDEX vulcan2xArbitrum_job_name ON vulcan2xArbitrum.job(name);

-- copied from 012
-- processing - everything is fine
-- stopped - error occured, job stopped
-- not-ready - not part of the current config
-- CREATE TYPE job_status AS ENUM ('processing', 'stopped', 'not-ready');

-- ALTER TABLE vulcan2xArbitrum.job 
--   ADD status job_status not null default 'not-ready',
--   ADD extra_info text;


-- -- copied from 013
-- -- DROP old, not used anymore tables

-- DROP TABLE vulcan2xArbitrum.extracted_block;
-- DROP TABLE vulcan2xArbitrum.transformed_block;
-- DROP TABLE vulcan2xArbitrum.done_job;
