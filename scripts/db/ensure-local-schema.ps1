$ErrorActionPreference = "Stop"

$containerName = "cm-platform-db"
$databaseName = "CMPlatform"
$saPassword = "#Pop,6300"

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

if object_id('dbo.EmailDelivery', 'U') is null
begin
    create table dbo.EmailDelivery (
        EmailDeliveryId int identity(1,1) not null
            constraint PK_EmailDelivery primary key,
        Provider varchar(50) not null,
        ProviderEmailId varchar(100) not null,
        RecipientEmail varchar(320) not null,
        Subject varchar(500) null,
        SenderEmail varchar(320) null
    );
end

if exists (
    select 1
    from sys.indexes
    where name = 'IX_EmailDelivery_LastEventAt'
      and object_id = object_id('dbo.EmailDelivery')
)
begin
    drop index IX_EmailDelivery_LastEventAt on dbo.EmailDelivery;
end

if object_id('DF_EmailDelivery_FirstEventAt', 'D') is not null
    alter table dbo.EmailDelivery drop constraint DF_EmailDelivery_FirstEventAt;

if object_id('DF_EmailDelivery_LastEventAt', 'D') is not null
    alter table dbo.EmailDelivery drop constraint DF_EmailDelivery_LastEventAt;

if COL_LENGTH('dbo.EmailDelivery', 'LatestEventType') is not null
    alter table dbo.EmailDelivery drop column LatestEventType;

if COL_LENGTH('dbo.EmailDelivery', 'FirstEventAt') is not null
    alter table dbo.EmailDelivery drop column FirstEventAt;

if COL_LENGTH('dbo.EmailDelivery', 'LastEventAt') is not null
    alter table dbo.EmailDelivery drop column LastEventAt;

if COL_LENGTH('dbo.EmailDelivery', 'SuppressedReason') is not null
    alter table dbo.EmailDelivery drop column SuppressedReason;

if COL_LENGTH('dbo.EmailDelivery', 'SuppressedType') is not null
    alter table dbo.EmailDelivery drop column SuppressedType;

if COL_LENGTH('dbo.EmailDelivery', 'SuppressedMessage') is not null
    alter table dbo.EmailDelivery drop column SuppressedMessage;

if not exists (
    select 1
    from sys.indexes
    where name = 'UX_EmailDelivery_Provider_Email_Recipient'
      and object_id = object_id('dbo.EmailDelivery')
)
begin
    create unique nonclustered index UX_EmailDelivery_Provider_Email_Recipient
        on dbo.EmailDelivery(Provider, ProviderEmailId, RecipientEmail);
end

if object_id('dbo.EmailDeliveryEvent', 'U') is null
begin
    create table dbo.EmailDeliveryEvent (
        EmailDeliveryEventId int identity(1,1) not null
            constraint PK_EmailDeliveryEvent primary key,
        EmailDeliveryId int not null,
        EventType varchar(100) not null,
        EventPayload nvarchar(max) null,
        ReceivedAt datetime2(0) not null
            constraint DF_EmailDeliveryEvent_ReceivedAt default (sysutcdatetime()),
        constraint FK_EmailDeliveryEvent_EmailDelivery
            foreign key (EmailDeliveryId)
            references dbo.EmailDelivery(EmailDeliveryId)
    );
end

if exists (
    select 1
    from sys.indexes
    where name = 'IX_EmailDeliveryEvent_EmailDelivery_ProviderEventAt'
      and object_id = object_id('dbo.EmailDeliveryEvent')
)
begin
    drop index IX_EmailDeliveryEvent_EmailDelivery_ProviderEventAt on dbo.EmailDeliveryEvent;
end

if COL_LENGTH('dbo.EmailDeliveryEvent', 'ProviderEventAt') is not null
    alter table dbo.EmailDeliveryEvent drop column ProviderEventAt;

if not exists (
    select 1
    from sys.indexes
    where name = 'IX_EmailDeliveryEvent_EmailDelivery_ReceivedAt'
      and object_id = object_id('dbo.EmailDeliveryEvent')
)
begin
    create nonclustered index IX_EmailDeliveryEvent_EmailDelivery_ReceivedAt
        on dbo.EmailDeliveryEvent(EmailDeliveryId, ReceivedAt desc);
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

"@

docker exec $containerName /opt/mssql-tools18/bin/sqlcmd `
    -S localhost `
    -U sa `
    -P $saPassword `
    -C `
    -b `
    -Q $query

exit $LASTEXITCODE
