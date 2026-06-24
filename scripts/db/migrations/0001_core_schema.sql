set quoted_identifier on;
set ansi_nulls on;
set ansi_padding on;
set ansi_warnings on;
set arithabort on;
set concat_null_yields_null on;
set numeric_roundabort off;

if object_id('dbo.Advertiser', 'U') is null
begin
  create table dbo.Advertiser (
    AdvertiserId int identity(1,1) not null
      constraint PK_Advertiser primary key,
    AdvertiserName varchar(255) not null,
    ExternalId varchar(100) null,
    IsActive bit not null
      constraint DF_Advertiser_IsActive default (1),
    CreatedAt datetime2(0) not null
      constraint DF_Advertiser_CreatedAt default (sysutcdatetime()),
    CreatedBy varchar(100) null,
    UpdatedAt datetime2(0) null,
    UpdatedBy varchar(100) null
  );
end

if not exists (
  select 1 from sys.indexes
  where name = 'UX_Advertiser_Name'
    and object_id = object_id('dbo.Advertiser')
)
  create unique nonclustered index UX_Advertiser_Name
    on dbo.Advertiser(AdvertiserName);

if not exists (
  select 1 from sys.indexes
  where name = 'UX_Advertiser_ExternalId'
    and object_id = object_id('dbo.Advertiser')
)
  create unique nonclustered index UX_Advertiser_ExternalId
    on dbo.Advertiser(ExternalId);

if object_id('dbo.Offer', 'U') is null
begin
  create table dbo.Offer (
    OfferId int identity(1,1) not null
      constraint PK_Offer primary key,
    AdvertiserId int not null,
    OfferName varchar(255) not null,
    ExternalId varchar(100) null,
    IsActive bit not null
      constraint DF_Offer_IsActive default (1),
    CreatedAt datetime2(0) not null
      constraint DF_Offer_CreatedAt default (sysutcdatetime()),
    CreatedBy varchar(100) null,
    UpdatedAt datetime2(0) null,
    UpdatedBy varchar(100) null,
    constraint FK_Offer_Advertiser
      foreign key (AdvertiserId)
      references dbo.Advertiser(AdvertiserId)
  );
end

if not exists (
  select 1 from sys.indexes
  where name = 'UX_Offer_Advertiser_Name'
    and object_id = object_id('dbo.Offer')
)
  create unique nonclustered index UX_Offer_Advertiser_Name
    on dbo.Offer(AdvertiserId, OfferName);

if not exists (
  select 1 from sys.indexes
  where name = 'UX_Offer_Advertiser_ExternalId'
    and object_id = object_id('dbo.Offer')
)
  create unique nonclustered index UX_Offer_Advertiser_ExternalId
    on dbo.Offer(AdvertiserId, ExternalId);

if object_id('dbo.Publisher', 'U') is null
begin
  create table dbo.Publisher (
    PublisherId int identity(1,1) not null
      constraint PK_Publisher primary key,
    PublisherName varchar(255) not null,
    ExternalId varchar(100) null,
    IsActive bit not null
      constraint DF_Publisher_IsActive default (1),
    CreatedAt datetime2(0) not null
      constraint DF_Publisher_CreatedAt default (sysutcdatetime()),
    CreatedBy varchar(100) null,
    UpdatedAt datetime2(0) null,
    UpdatedBy varchar(100) null,
    ContactName varchar(255) null,
    ContactEmail varchar(255) null,
    WebsiteUrl varchar(500) null,
    RegistrationNotes varchar(max) null,
    RegistrationStatus varchar(50) not null
      constraint DF_Publisher_RegistrationStatus default ('approved'),
    PasswordHash varchar(500) null,
    PasswordSetAt datetime2(0) null,
    LastLoginAt datetime2(0) null
  );
end

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

if not exists (
  select 1 from sys.indexes
  where name = 'UX_Publisher_Name'
    and object_id = object_id('dbo.Publisher')
)
  create unique nonclustered index UX_Publisher_Name
    on dbo.Publisher(PublisherName);

if not exists (
  select 1 from sys.indexes
  where name = 'UX_Publisher_ExternalId'
    and object_id = object_id('dbo.Publisher')
)
  create unique nonclustered index UX_Publisher_ExternalId
    on dbo.Publisher(ExternalId);

if exists (
  select 1 from sys.indexes
  where name = 'UX_Publisher_ContactEmail'
    and object_id = object_id('dbo.Publisher')
)
  drop index UX_Publisher_ContactEmail on dbo.Publisher;

if not exists (
  select 1 from sys.indexes
  where name = 'IX_Publisher_ContactEmail'
    and object_id = object_id('dbo.Publisher')
)
  create nonclustered index IX_Publisher_ContactEmail
    on dbo.Publisher(ContactEmail);

if object_id('dbo.PublisherOffer', 'U') is null
begin
  create table dbo.PublisherOffer (
    PublisherOfferId int identity(1,1) not null
      constraint PK_PublisherOffer primary key,
    PublisherId int not null,
    OfferId int not null,
    IsActive bit not null
      constraint DF_PublisherOffer_IsActive default (1),
    CreatedAt datetime2(0) not null
      constraint DF_PublisherOffer_CreatedAt default (sysutcdatetime()),
    CreatedBy varchar(100) null,
    UpdatedAt datetime2(0) null,
    UpdatedBy varchar(100) null,
    constraint FK_PublisherOffer_Publisher
      foreign key (PublisherId)
      references dbo.Publisher(PublisherId),
    constraint FK_PublisherOffer_Offer
      foreign key (OfferId)
      references dbo.Offer(OfferId)
  );
end

if not exists (
  select 1 from sys.indexes
  where name = 'UX_PublisherOffer_Publisher_Offer'
    and object_id = object_id('dbo.PublisherOffer')
)
  create unique nonclustered index UX_PublisherOffer_Publisher_Offer
    on dbo.PublisherOffer(PublisherId, OfferId);

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
  select 1 from sys.indexes
  where name = 'UX_Account_EmailAddress'
    and object_id = object_id('dbo.Account')
)
  create unique nonclustered index UX_Account_EmailAddress
    on dbo.Account(EmailAddress);

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
  select 1 from sys.indexes
  where name = 'UX_AuthSession_SessionTokenHash'
    and object_id = object_id('dbo.AuthSession')
)
  create unique nonclustered index UX_AuthSession_SessionTokenHash
    on dbo.AuthSession(SessionTokenHash);

if not exists (
  select 1 from sys.indexes
  where name = 'IX_AuthSession_AccountId'
    and object_id = object_id('dbo.AuthSession')
)
  create nonclustered index IX_AuthSession_AccountId
    on dbo.AuthSession(AccountId);

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
  select 1 from sys.indexes
  where name = 'IX_AuthChallenge_CodeHash'
    and object_id = object_id('dbo.AuthChallenge')
)
  create nonclustered index IX_AuthChallenge_CodeHash
    on dbo.AuthChallenge(CodeHash);

if not exists (
  select 1 from sys.indexes
  where name = 'IX_AuthChallenge_Account_Type'
    and object_id = object_id('dbo.AuthChallenge')
)
  create nonclustered index IX_AuthChallenge_Account_Type
    on dbo.AuthChallenge(AccountId, ChallengeType, UsedAt, ExpiresAt);

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
  select 1 from sys.indexes
  where name = 'IX_WidgetQueueDemo_Status_CreatedAt'
    and object_id = object_id('dbo.WidgetQueueDemo')
)
  create nonclustered index IX_WidgetQueueDemo_Status_CreatedAt
    on dbo.WidgetQueueDemo(Status, CreatedAt desc);

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
  select 1 from sys.indexes
  where name = 'IX_WidgetConsumerDemo_Status_CreatedAt'
    and object_id = object_id('dbo.WidgetConsumerDemo')
)
  create nonclustered index IX_WidgetConsumerDemo_Status_CreatedAt
    on dbo.WidgetConsumerDemo(Status, CreatedAt desc);
