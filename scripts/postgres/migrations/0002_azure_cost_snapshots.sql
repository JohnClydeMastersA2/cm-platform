create table if not exists azure_cost_daily (
  usage_date date not null,
  resource_type text not null,
  currency text not null,
  pretax_cost numeric(14, 6) not null,
  fetched_at timestamptz not null default now(),
  primary key (usage_date, resource_type, currency)
);

create index if not exists ix_azure_cost_daily_usage_date
  on azure_cost_daily (usage_date desc);
