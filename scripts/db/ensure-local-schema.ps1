$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envFile = Join-Path $repoRoot "packages\secrets\cm-platform.env"
$containerName = "cm-platform-db"
$databaseName = "CMPlatform"

function Get-DevEnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if (-not (Test-Path $envFile)) {
        throw "Missing local secrets file: $envFile"
    }

    $line = Get-Content $envFile |
        Where-Object { $_ -match "^\s*$([regex]::Escape($Name))=" } |
        Select-Object -First 1

    if (-not $line) {
        throw "Missing required local secret '$Name' in $envFile"
    }

    return ($line -replace "^\s*$([regex]::Escape($Name))=", "").Trim()
}

$saPassword = Get-DevEnvValue -Name "MSSQL_SA_PASSWORD"

$query = @"
use [$databaseName];

set quoted_identifier on;
set ansi_nulls on;
set ansi_padding on;
set ansi_warnings on;
set arithabort on;
set concat_null_yields_null on;
set numeric_roundabort off;

if COL_LENGTH('dbo.Publisher', 'ContactName') is null
    alter table dbo.Publisher add ContactName varchar(255) null;

if COL_LENGTH('dbo.Publisher', 'ContactEmail') is null
    alter table dbo.Publisher add ContactEmail varchar(255) null;

if COL_LENGTH('dbo.Publisher', 'WebsiteUrl') is null
    alter table dbo.Publisher add WebsiteUrl varchar(500) null;

if COL_LENGTH('dbo.Publisher', 'RegistrationNotes') is null
    alter table dbo.Publisher add RegistrationNotes varchar(max) null;

if COL_LENGTH('dbo.Publisher', 'RegistrationStatus') is null
    alter table dbo.Publisher add RegistrationStatus varchar(50) not null
        constraint DF_Publisher_RegistrationStatus default ('approved');

if COL_LENGTH('dbo.Publisher', 'PasswordHash') is null
    alter table dbo.Publisher add PasswordHash varchar(500) null;

if COL_LENGTH('dbo.Publisher', 'PasswordSetAt') is null
    alter table dbo.Publisher add PasswordSetAt datetime2(0) null;

if COL_LENGTH('dbo.Publisher', 'LastLoginAt') is null
    alter table dbo.Publisher add LastLoginAt datetime2(0) null;

if exists (
    select 1
    from sys.indexes
    where name = 'UX_Publisher_ContactEmail'
      and object_id = object_id('dbo.Publisher')
)
begin
    drop index UX_Publisher_ContactEmail on dbo.Publisher;
end

if not exists (
    select 1
    from sys.indexes
    where name = 'IX_Publisher_ContactEmail'
      and object_id = object_id('dbo.Publisher')
)
begin
    create nonclustered index IX_Publisher_ContactEmail
        on dbo.Publisher(ContactEmail);
end

if object_id('dbo.Account', 'U') is null
begin
    create table dbo.Account (
        AccountId int identity(1,1) not null
            constraint PK_Account primary key,
        EmailAddress varchar(320) not null,
        PasswordHash varchar(500) not null,
        EmailVerifiedAt datetime2(0) null,
        Status varchar(50) not null
            constraint DF_Account_Status default ('active'),
        CreatedAt datetime2(0) not null
            constraint DF_Account_CreatedAt default (sysutcdatetime()),
        LastLoginAt datetime2(0) null
    );
end

if not exists (
    select 1
    from sys.indexes
    where name = 'UX_Account_EmailAddress'
      and object_id = object_id('dbo.Account')
)
begin
    create unique nonclustered index UX_Account_EmailAddress
        on dbo.Account(EmailAddress);
end

if object_id('dbo.AuthSession', 'U') is null
begin
    create table dbo.AuthSession (
        AuthSessionId int identity(1,1) not null
            constraint PK_AuthSession primary key,
        AccountId int not null,
        SessionTokenHash varchar(128) not null,
        CreatedAt datetime2(0) not null
            constraint DF_AuthSession_CreatedAt default (sysutcdatetime()),
        ExpiresAt datetime2(0) not null,
        RevokedAt datetime2(0) null,
        constraint FK_AuthSession_Account
            foreign key (AccountId)
            references dbo.Account(AccountId)
            on delete cascade
    );
end

if not exists (
    select 1
    from sys.indexes
    where name = 'UX_AuthSession_SessionTokenHash'
      and object_id = object_id('dbo.AuthSession')
)
begin
    create unique nonclustered index UX_AuthSession_SessionTokenHash
        on dbo.AuthSession(SessionTokenHash);
end

if not exists (
    select 1
    from sys.indexes
    where name = 'IX_AuthSession_AccountId'
      and object_id = object_id('dbo.AuthSession')
)
begin
    create nonclustered index IX_AuthSession_AccountId
        on dbo.AuthSession(AccountId);
end

if object_id('dbo.AuthChallenge', 'U') is null
begin
    create table dbo.AuthChallenge (
        AuthChallengeId int identity(1,1) not null
            constraint PK_AuthChallenge primary key,
        AccountId int not null,
        ChallengeType varchar(50) not null,
        CodeHash varchar(128) not null,
        CreatedAt datetime2(0) not null
            constraint DF_AuthChallenge_CreatedAt default (sysutcdatetime()),
        ExpiresAt datetime2(0) not null,
        UsedAt datetime2(0) null,
        constraint FK_AuthChallenge_Account
            foreign key (AccountId)
            references dbo.Account(AccountId)
            on delete cascade
    );
end

if not exists (
    select 1
    from sys.indexes
    where name = 'IX_AuthChallenge_CodeHash'
      and object_id = object_id('dbo.AuthChallenge')
)
begin
    create nonclustered index IX_AuthChallenge_CodeHash
        on dbo.AuthChallenge(CodeHash);
end

if not exists (
    select 1
    from sys.indexes
    where name = 'IX_AuthChallenge_Account_Type'
      and object_id = object_id('dbo.AuthChallenge')
)
begin
    create nonclustered index IX_AuthChallenge_Account_Type
        on dbo.AuthChallenge(AccountId, ChallengeType, UsedAt, ExpiresAt);
end

if object_id('dbo.WidgetQueueDemo', 'U') is null
begin
    create table dbo.WidgetQueueDemo (
        WidgetId int identity(1,1) not null
            constraint PK_WidgetQueueDemo primary key,
        WidgetName varchar(200) not null,
        Status varchar(50) not null
            constraint DF_WidgetQueueDemo_Status default ('queued'),
        CreatedAt datetime2(0) not null
            constraint DF_WidgetQueueDemo_CreatedAt default (sysutcdatetime()),
        QueuedAt datetime2(0) null,
        ProcessingStartedAt datetime2(0) null,
        ProcessedAt datetime2(0) null,
        ProcessCount int not null
            constraint DF_WidgetQueueDemo_ProcessCount default (0),
        LastMessageId varchar(100) null,
        LastError varchar(max) null
    );
end

if COL_LENGTH('dbo.WidgetQueueDemo', 'LastError') is null
    alter table dbo.WidgetQueueDemo add LastError varchar(max) null;

if not exists (
    select 1
    from sys.indexes
    where name = 'IX_WidgetQueueDemo_Status_CreatedAt'
      and object_id = object_id('dbo.WidgetQueueDemo')
)
begin
    create nonclustered index IX_WidgetQueueDemo_Status_CreatedAt
        on dbo.WidgetQueueDemo(Status, CreatedAt desc);
end

if object_id('dbo.WidgetConsumerDemo', 'U') is null
begin
    create table dbo.WidgetConsumerDemo (
        WidgetId int identity(1,1) not null
            constraint PK_WidgetConsumerDemo primary key,
        WidgetName varchar(200) not null,
        Status varchar(50) not null
            constraint DF_WidgetConsumerDemo_Status default ('queued'),
        CreatedAt datetime2(0) not null
            constraint DF_WidgetConsumerDemo_CreatedAt default (sysutcdatetime()),
        QueuedAt datetime2(0) null,
        ProcessingStartedAt datetime2(0) null,
        ProcessedAt datetime2(0) null,
        ProcessedBy varchar(100) null,
        ProcessingSeconds int null,
        LastMessageId varchar(100) null,
        LastError varchar(max) null
    );
end

if COL_LENGTH('dbo.WidgetConsumerDemo', 'ProcessedBy') is null
    alter table dbo.WidgetConsumerDemo add ProcessedBy varchar(100) null;

if COL_LENGTH('dbo.WidgetConsumerDemo', 'ProcessingSeconds') is null
    alter table dbo.WidgetConsumerDemo add ProcessingSeconds int null;

if not exists (
    select 1
    from sys.indexes
    where name = 'IX_WidgetConsumerDemo_Status_CreatedAt'
      and object_id = object_id('dbo.WidgetConsumerDemo')
)
begin
    create nonclustered index IX_WidgetConsumerDemo_Status_CreatedAt
        on dbo.WidgetConsumerDemo(Status, CreatedAt desc);
end

"@

docker exec $containerName /opt/mssql-tools18/bin/sqlcmd `
    -S localhost `
    -U sa `
    -P $saPassword `
    -C `
    -b `
    -Q $query

exit $LASTEXITCODE
