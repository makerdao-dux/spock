-- copied from 006
ALTER TABLE vulcan2xArbitrum.transaction 
  ADD COLUMN nonce integer,
  ADD COLUMN value numeric(78, 0),
  ADD COLUMN gas_limit numeric(78,0),
  ADD COLUMN gas_price numeric(78,0),
  ADD COLUMN data TEXT;
  
-- copied from 007
CREATE TABLE vulcan2xArbitrum.address (
  address       character varying(66) not null unique,
  bytecode_hash character varying(66),
  is_contract   boolean not null default FALSE
);

-- copied from 008
CREATE TABLE vulcan2xArbitrum.enhanced_transaction (
  hash         character varying(66) not null,
  method_name  character varying(255),
  arg0         text,
  arg1         text,
  arg2         text,
  args         json,
  primary key (hash)
);

-- --copied from 010
-- CREATE TABLE vulcan2xArbitrum.done_job (
--   id             serial primary key,
--   -- ranges are inclusive
--   start_block_id integer not null,
--   end_block_id   integer not null,

--   -- name can be both extractor or transformer
--   name character varying(100) not null,
--   unique (start_block_id, end_block_id, name)
-- );
-- CREATE INDEX vulcan2xArbitrum_done_job_extractor_name ON vulcan2xArbitrum.done_job(name);


-- -- missing index for block hash
-- CREATE INDEX vulcan2xArbitrum_block_hash_index ON vulcan2xArbitrum.block(hash);

-- -- copied from 011
-- CREATE TABLE vulcan2xArbitrum.job (
--   id             serial primary key,
--   -- name can be both extractor or transformer
--   name character varying(100) not null,
--   last_block_id   integer not null,

--   unique (name)
-- );
-- CREATE INDEX vulcan2xArbitrum_job_name ON vulcan2xArbitrum.job(name);

-- -- copied from 012
-- -- processing - everything is fine
-- -- stopped - error occured, job stopped
-- -- not-ready - not part of the current config
-- CREATE TYPE job_status AS ENUM ('processing', 'stopped', 'not-ready');

-- ALTER TABLE vulcan2xArbitrum.job 
--   ADD status job_status not null default 'not-ready',
--   ADD extra_info text;


-- -- copied from 013
-- -- DROP old, not used anymore tables

-- DROP TABLE vulcan2xArbitrum.extracted_block;
-- DROP TABLE vulcan2xArbitrum.transformed_block;
-- DROP TABLE vulcan2xArbitrum.done_job;
