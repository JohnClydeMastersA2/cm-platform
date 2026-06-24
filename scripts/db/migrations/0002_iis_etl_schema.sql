if object_id('dbo.iis_log_import_batch', 'U') is null
begin
  create table dbo.iis_log_import_batch (
    id bigint identity(1,1) not null
      constraint pk_iis_log_import_batch primary key,
    file_name varchar(260) not null,
    file_size bigint not null,
    started_at datetime2(0) not null
      constraint df_iis_log_import_batch_started_at default (sysutcdatetime()),
    completed_at datetime2(0) null,
    status varchar(20) not null,
    row_count int null,
    error_message varchar(max) null,
    source_server_name varchar(100) not null
  );
end

if object_id('dbo.iis_log_import_file', 'U') is null
begin
  create table dbo.iis_log_import_file (
    id bigint identity(1,1) not null
      constraint pk_iis_log_import_file primary key,
    file_name varchar(260) not null,
    file_size bigint not null,
    file_hash varchar(128) null,
    imported_at datetime2(0) not null
      constraint df_iis_log_import_file_imported_at default (sysutcdatetime()),
    row_count int null,
    source_server_name varchar(100) not null
  );
end

if not exists (
  select 1 from sys.indexes
  where name = 'ux_iis_log_import_file_file_hash'
    and object_id = object_id('dbo.iis_log_import_file')
)
  create unique nonclustered index ux_iis_log_import_file_file_hash
    on dbo.iis_log_import_file(file_hash);

if not exists (
  select 1 from sys.indexes
  where name = 'ix_iis_log_import_file_server_hash'
    and object_id = object_id('dbo.iis_log_import_file')
)
  create nonclustered index ix_iis_log_import_file_server_hash
    on dbo.iis_log_import_file(source_server_name, file_hash);

if not exists (
  select 1 from sys.indexes
  where name = 'ix_iis_log_import_file_server_file'
    and object_id = object_id('dbo.iis_log_import_file')
)
  create nonclustered index ix_iis_log_import_file_server_file
    on dbo.iis_log_import_file(source_server_name, file_name, file_size);

if object_id('dbo.iis_log_import_staging', 'U') is null
begin
  create table dbo.iis_log_import_staging (
    id bigint identity(1,1) not null
      constraint pk_iis_log_import_staging primary key,
    source_file_name varchar(260) not null,
    imported_at datetime2(0) not null
      constraint df_iis_log_import_staging_imported_at default (sysutcdatetime()),
    log_date date null,
    log_time time(0) null,
    s_sitename varchar(255) null,
    s_computername varchar(255) null,
    s_ip varchar(50) null,
    cs_method varchar(20) null,
    cs_uri_stem varchar(2048) null,
    cs_uri_query varchar(max) null,
    s_port int null,
    cs_username varchar(255) null,
    c_ip varchar(50) null,
    cs_user_agent varchar(max) null,
    cs_referer varchar(max) null,
    sc_status int null,
    sc_substatus int null,
    sc_win32_status int null,
    time_taken int null,
    raw_line varchar(max) not null,
    cs_cookie varchar(max) null,
    sc_bytes int null,
    is_asp int not null,
    source_server_name varchar(100) not null
  );
end

if not exists (
  select 1 from sys.indexes
  where name = 'ix_iis_log_import_staging_log_date'
    and object_id = object_id('dbo.iis_log_import_staging')
)
  create nonclustered index ix_iis_log_import_staging_log_date
    on dbo.iis_log_import_staging(log_date);

if not exists (
  select 1 from sys.indexes
  where name = 'ix_iis_log_import_staging_cs_uri_stem'
    and object_id = object_id('dbo.iis_log_import_staging')
)
  create nonclustered index ix_iis_log_import_staging_cs_uri_stem
    on dbo.iis_log_import_staging(cs_uri_stem);

if not exists (
  select 1 from sys.indexes
  where name = 'ix_iis_log_import_staging_sc_status'
    and object_id = object_id('dbo.iis_log_import_staging')
)
  create nonclustered index ix_iis_log_import_staging_sc_status
    on dbo.iis_log_import_staging(sc_status);

if not exists (
  select 1 from sys.indexes
  where name = 'ix_iis_log_import_staging_c_ip'
    and object_id = object_id('dbo.iis_log_import_staging')
)
  create nonclustered index ix_iis_log_import_staging_c_ip
    on dbo.iis_log_import_staging(c_ip);

if not exists (
  select 1 from sys.indexes
  where name = 'ix_iis_log_import_staging_source_file_name'
    and object_id = object_id('dbo.iis_log_import_staging')
)
  create nonclustered index ix_iis_log_import_staging_source_file_name
    on dbo.iis_log_import_staging(source_file_name);

if not exists (
  select 1 from sys.indexes
  where name = 'ix_iis_log_import_staging_server_file'
    and object_id = object_id('dbo.iis_log_import_staging')
)
  create nonclustered index ix_iis_log_import_staging_server_file
    on dbo.iis_log_import_staging(source_server_name, source_file_name);

if object_id('dbo.iis_dashboard_overall_summary', 'U') is null
begin
  create table dbo.iis_dashboard_overall_summary (
    id bigint identity(1,1) not null
      constraint pk_iis_dashboard_overall_summary primary key,
    refreshed_at datetime2(0) not null
      constraint df_iis_dashboard_overall_summary_refreshed_at default (sysutcdatetime()),
    total_records bigint not null,
    min_log_date date null,
    max_log_date date null,
    number_of_days int null,
    avg_requests_per_day decimal(18,2) null,
    min_imported_at datetime2(0) null,
    max_imported_at datetime2(0) null,
    unique_client_ips bigint not null,
    unique_uri_stems bigint not null,
    unique_source_files bigint not null,
    unique_source_servers bigint not null,
    count_2xx bigint not null,
    count_3xx bigint not null,
    count_4xx bigint not null,
    count_5xx bigint not null,
    pct_2xx decimal(10,2) not null,
    pct_3xx decimal(10,2) not null,
    pct_4xx decimal(10,2) not null,
    pct_5xx decimal(10,2) not null,
    avg_time_taken_ms decimal(18,2) null,
    min_time_taken_ms int null,
    max_time_taken_ms int null,
    total_sc_bytes bigint null,
    avg_sc_bytes decimal(18,2) null
  );
end

if object_id('dbo.iis_dashboard_uri_stem_asp_summary', 'U') is null
begin
  create table dbo.iis_dashboard_uri_stem_asp_summary (
    id bigint identity(1,1) not null
      constraint pk_iis_dashboard_uri_stem_asp_summary primary key,
    refreshed_at datetime2(0) not null
      constraint df_iis_dashboard_uri_stem_asp_summary_refreshed_at default (sysutcdatetime()),
    cs_uri_stem varchar(2048) not null,
    hits bigint not null,
    pct_of_asp_total decimal(10,2) not null,
    unique_ips bigint not null,
    avg_time_taken_ms decimal(18,2) null,
    count_2xx bigint not null,
    count_3xx bigint not null,
    count_4xx bigint not null,
    count_5xx bigint not null,
    pct_4xx decimal(10,2) not null,
    pct_5xx decimal(10,2) not null
  );
end

if not exists (
  select 1 from sys.indexes
  where name = 'ix_iis_dashboard_uri_stem_asp_summary_uri'
    and object_id = object_id('dbo.iis_dashboard_uri_stem_asp_summary')
)
  create nonclustered index ix_iis_dashboard_uri_stem_asp_summary_uri
    on dbo.iis_dashboard_uri_stem_asp_summary(cs_uri_stem);

if not exists (
  select 1 from sys.indexes
  where name = 'ix_iis_dashboard_uri_stem_asp_summary_hits'
    and object_id = object_id('dbo.iis_dashboard_uri_stem_asp_summary')
)
  create nonclustered index ix_iis_dashboard_uri_stem_asp_summary_hits
    on dbo.iis_dashboard_uri_stem_asp_summary(hits desc);
