create table "public"."segments" (
  id bigserial primary key,
  segment_name text,
  user_ids int[]
);