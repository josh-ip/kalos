-- Enable pgvector extension
create extension if not exists vector with schema public;

-- Create tables 
create table "public"."nods_replica_page" (
  id bigserial primary key,
  replica_title text
);
alter table "public"."nods_replica_page" enable row level security;


create table "public"."nods_replica_page_section" (
  id bigserial primary key,
  page_id bigint not null references public.nods_replica_page on delete cascade,
  content text,
  token_count int,
  embedding vector(1536)
);
alter table "public"."nods_replica_page_section" enable row level security;


-- Create embedding similarity search functions
create or replace function match_replica_page_sections(embedding vector(1536), match_threshold float, match_count int, min_content_length int)
returns table (id bigint, page_id bigint, content text, similarity float)
language plpgsql
as $$
#variable_conflict use_variable
begin
  return query
  select
    nods_replica_page_section.id,
    nods_replica_page_section.page_id,
    nods_replica_page_section.content,
    (nods_replica_page_section.embedding <#> embedding) * -1 as similarity
  from nods_replica_page_section

  -- We only care about sections that have a useful amount of content
  where length(nods_replica_page_section.content) >= min_content_length

  -- The dot product is negative because of a Postgres limitation, so we negate it
  and (nods_replica_page_section.embedding <#> embedding) * -1 > match_threshold

  -- OpenAI embeddings are normalized to length 1, so
  -- cosine similarity and dot product will produce the same results.
  -- Using dot product which can be computed slightly faster.
  --
  -- For the different syntaxes, see https://github.com/pgvector/pgvector
  order by nods_replica_page_section.embedding <#> embedding
  
  limit match_count;
end;
$$;