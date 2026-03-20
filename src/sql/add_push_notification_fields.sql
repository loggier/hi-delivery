alter table grupohubs.riders
  add column if not exists push_token text,
  add column if not exists push_platform varchar(20),
  add column if not exists push_token_updated_at timestamp with time zone;

alter table grupohubs.users
  add column if not exists web_push_token text,
  add column if not exists web_push_token_updated_at timestamp with time zone;
