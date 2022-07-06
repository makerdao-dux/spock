CREATE SCHEMA vulcan2xArbitrum;

CREATE TABLE vulcan2xArbitrum.block (
  id           serial primary key,
  number       integer not null,
  hash         character varying(66) not null,
  timestamp    timestamptz not null,

  CONSTRAINT   unique_hash UNIQUE(hash)
);

CREATE INDEX vulcan2xArbitrum_block_number_index ON vulcan2xArbitrum.block(number);

CREATE TABLE vulcan2xArbitrum.extracted_block (
  id             serial primary key,
  block_id       integer not null REFERENCES vulcan2xArbitrum.block(id) ON DELETE CASCADE,
  extractor_name character varying(100) not null,
  status         character varying(100) not null,
  unique (block_id, extractor_name)
);
CREATE INDEX vulcan2xArbitrum_extracted_block_extractor_name ON vulcan2xArbitrum.extracted_block(extractor_name);

CREATE TABLE vulcan2xArbitrum.transformed_block (
  id               serial primary key,
  block_id         integer not null REFERENCES vulcan2xArbitrum.block(id) ON DELETE CASCADE,
  transformer_name character varying(100) not null,
  status           character varying(100) not null,
  unique (block_id, transformer_name)
);
CREATE INDEX vulcan2xArbitrum_transformed_block_transformer_name ON vulcan2xArbitrum.transformed_block(transformer_name);

CREATE TABLE vulcan2xArbitrum.transaction (
  id           serial primary key,
  hash         character varying(66) not null,
  to_address   character varying(66) not null,
  from_address character varying(66) not null,
  block_id     integer not null REFERENCES vulcan2xArbitrum.block(id) ON DELETE CASCADE,

  CONSTRAINT   transaction_unique_hash UNIQUE(hash)
);

-- copied from 002
CREATE SCHEMA extractedArbitrum;

CREATE TABLE extractedArbitrum.logs (
  id           serial primary key,
  block_id     integer not null REFERENCES vulcan2xArbitrum.block(id) ON DELETE CASCADE,
  log_index    integer not null,
  address      character varying(66) not null,
  data         text not null,
  topics       character varying(400) not null,
  tx_id        integer not null REFERENCES vulcan2xArbitrum.transaction(id) ON DELETE CASCADE,

  unique (log_index, tx_id)
);

-- copied from 003
CREATE INDEX vulcan2xArbitrum_extracted_block_block_id ON vulcan2xArbitrum.extracted_block(block_id);
CREATE INDEX vulcan2xArbitrum_transformed_block_block_id ON vulcan2xArbitrum.transformed_block(block_id);

-- copied from 004
CREATE INDEX vulcan2xArbitrum_extracted_block_status ON vulcan2xArbitrum.extracted_block(status);
CREATE INDEX vulcan2xArbitrum_transformed_block_status ON vulcan2xArbitrum.transformed_block(status);

-- copied from 005
CREATE INDEX extractedArbitrum_logs_address ON extractedArbitrum.logs(address);
CREATE INDEX extractedArbitrum_logs_block_id ON extractedArbitrum.logs(block_id);

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

-- job_status type already exists
-- CREATE TYPE job_status AS ENUM ('processing', 'stopped', 'not-ready');

ALTER TABLE vulcan2xArbitrum.job 
  ADD status job_status not null default 'not-ready',
  ADD extra_info text;


-- copied from 013
-- DROP old, not used anymore tables

DROP TABLE vulcan2xArbitrum.extracted_block;
DROP TABLE vulcan2xArbitrum.transformed_block;
DROP TABLE vulcan2xArbitrum.done_job;


--- Create table for chain IDs
CREATE SCHEMA chains;

CREATE TABLE chains.chain (
  id           serial primary key,
  chain_id     integer not null,
  name         character varying(66) not null,

  CONSTRAINT   unique_chain_name UNIQUE(name)
);

CREATE INDEX chain_id_index ON chains.chain(chain_id);