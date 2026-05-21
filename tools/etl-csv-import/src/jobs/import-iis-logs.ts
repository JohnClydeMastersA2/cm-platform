import { mkdir, readdir, rename, stat } from "node:fs/promises";
import { join, parse } from "node:path";
import { performance } from "node:perf_hooks";
import sql from "mssql";
import type { Logger } from "@cm/logging";
import { readIisLogFile, type IisLogRow } from "../lib/iis-log.js";
import { hashFileSha256 } from "../lib/hash.js";

type ImportIisLogsArgs = {
  db: sql.ConnectionPool;
  inputDir: string;
  archiveDir: string;
  logger: Logger;
  defaultSourceServerName: string;
};

type LogFileCandidate = {
  sourceServerName: string;
  fileName: string;
  fullPath: string;
  archiveDir: string;
};

const INSERT_CHUNK_SIZE = 250;

function toInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeServerName(value: string): string {
  return value.trim().toUpperCase();
}

function buildArchivedFileName(fileName: string, fileHash: string): string {
  const parsed = parse(fileName);

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  const stamp = `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
  const shortHash = fileHash.slice(0, 8);

  return `${parsed.name}_${stamp}_${shortHash}${parsed.ext}`;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

async function discoverLogFiles(
  inputDir: string,
  archiveRootDir: string,
  defaultSourceServerName: string,
): Promise<LogFileCandidate[]> {
  const candidates: LogFileCandidate[] = [];
  const entries = await readdir(inputDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".log")) {
      const sourceServerName = normalizeServerName(defaultSourceServerName);

      candidates.push({
        sourceServerName,
        fileName: entry.name,
        fullPath: join(inputDir, entry.name),
        archiveDir: join(archiveRootDir, sourceServerName),
      });

      continue;
    }

    if (!entry.isDirectory()) {
      continue;
    }

    const sourceServerName = normalizeServerName(entry.name);
    const serverInputDir = join(inputDir, entry.name);
    const serverArchiveDir = join(archiveRootDir, sourceServerName);
    const serverEntries = await readdir(serverInputDir, { withFileTypes: true });

    for (const serverEntry of serverEntries) {
      if (!serverEntry.isFile() || !serverEntry.name.toLowerCase().endsWith(".log")) {
        continue;
      }

      candidates.push({
        sourceServerName,
        fileName: serverEntry.name,
        fullPath: join(serverInputDir, serverEntry.name),
        archiveDir: serverArchiveDir,
      });
    }
  }

  return candidates;
}

async function createBatchRecord(
  transaction: sql.Transaction,
  sourceServerName: string,
  fileName: string,
  fileSize: number,
  status: "running" | "skipped" | "completed" | "failed",
): Promise<number> {
  const request = new sql.Request(transaction);
  request.input("source_server_name", sql.VarChar(100), sourceServerName);
  request.input("file_name", sql.VarChar(260), fileName);
  request.input("file_size", sql.BigInt, fileSize);
  request.input("status", sql.VarChar(20), status);

  const result = await request.query<{ id: number }>(`
    insert into dbo.iis_log_import_batch (
      source_server_name,
      file_name,
      file_size,
      status
    )
    values (
      @source_server_name,
      @file_name,
      @file_size,
      @status
    );

    select cast(scope_identity() as bigint) as id;
  `);

  const id = result.recordset[0]?.id;
  if (!id) {
    throw new Error(`Failed to create batch record for ${sourceServerName}/${fileName}`);
  }

  return id;
}

async function completeBatchRecord(
  transaction: sql.Transaction,
  batchId: number,
  status: "skipped" | "completed" | "failed",
  rowCount: number | null,
  errorMessage: string | null,
): Promise<void> {
  const request = new sql.Request(transaction);
  request.input("id", sql.BigInt, batchId);
  request.input("status", sql.VarChar(20), status);
  request.input("row_count", sql.Int, rowCount);
  request.input("error_message", sql.VarChar(sql.MAX), errorMessage);

  await request.query(`
    update dbo.iis_log_import_batch
    set
      status = @status,
      row_count = @row_count,
      error_message = @error_message,
      completed_at = sysutcdatetime()
    where id = @id;
  `);
}

function addStagingBulkColumns(table: sql.Table): void {
  table.columns.add("source_server_name", sql.VarChar(100), { nullable: false });
  table.columns.add("source_file_name", sql.VarChar(260), { nullable: false });
  table.columns.add("log_date", sql.Date, { nullable: true });
  table.columns.add("log_time", sql.VarChar(8), { nullable: true });
  table.columns.add("s_sitename", sql.VarChar(255), { nullable: true });
  table.columns.add("s_computername", sql.VarChar(255), { nullable: true });
  table.columns.add("s_ip", sql.VarChar(50), { nullable: true });
  table.columns.add("cs_method", sql.VarChar(20), { nullable: true });
  table.columns.add("cs_uri_stem", sql.VarChar(2048), { nullable: true });
  table.columns.add("cs_uri_query", sql.VarChar(sql.MAX), { nullable: true });
  table.columns.add("s_port", sql.Int, { nullable: true });
  table.columns.add("cs_username", sql.VarChar(255), { nullable: true });
  table.columns.add("c_ip", sql.VarChar(50), { nullable: true });
  table.columns.add("cs_user_agent", sql.VarChar(sql.MAX), { nullable: true });
  table.columns.add("cs_cookie", sql.VarChar(sql.MAX), { nullable: true });
  table.columns.add("cs_referer", sql.VarChar(sql.MAX), { nullable: true });
  table.columns.add("sc_status", sql.Int, { nullable: true });
  table.columns.add("sc_substatus", sql.Int, { nullable: true });
  table.columns.add("sc_bytes", sql.Int, { nullable: true });
  table.columns.add("time_taken", sql.Int, { nullable: true });
  table.columns.add("raw_line", sql.VarChar(sql.MAX), { nullable: false });
}

function buildStagingBulkTable(
  sourceServerName: string,
  rows: IisLogRow[],
): sql.Table {
  const table = new sql.Table("dbo.iis_log_import_staging");
  table.create = false;

  addStagingBulkColumns(table);

  for (const row of rows) {
    table.rows.add(
      sourceServerName,
      row.sourceFileName,
      row.date ?? null,
      row.time ?? null,
      row.s_sitename ?? null,
      row.s_computername ?? null,
      row.s_ip ?? null,
      row.cs_method ?? null,
      row.cs_uri_stem ?? null,
      row.cs_uri_query ?? null,
      toInt(row.s_port),
      row.cs_username ?? null,
      row.c_ip ?? null,
      row.cs_user_agent ?? null,
      row.cs_cookie ?? null,
      row.cs_referer ?? null,
      toInt(row.sc_status),
      toInt(row.sc_substatus),
      toInt(row.sc_bytes),
      toInt(row.time_taken),
      row.rawLine,
    );
  }

  return table;
}

async function insertStagingRowsBatch(
  transaction: sql.Transaction,
  sourceServerName: string,
  rows: IisLogRow[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const rawTable = buildStagingBulkTable(sourceServerName, rows);
  const stageTableName = "#iis_log_import_staging_bulk";

  const createStageRequest = new sql.Request(transaction);
  await createStageRequest.batch(`
    if object_id('tempdb..${stageTableName}') is not null
      drop table ${stageTableName};

    create table ${stageTableName} (
      source_server_name varchar(100) not null,
      source_file_name varchar(260) not null,
      log_date date null,
      log_time varchar(8) null,
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
      cs_cookie varchar(max) null,
      cs_referer varchar(max) null,
      sc_status int null,
      sc_substatus int null,
      sc_bytes int null,
      time_taken int null,
      raw_line varchar(max) not null
    );
  `);

  const bulkTable = new sql.Table(stageTableName);
  bulkTable.create = false;
  addStagingBulkColumns(bulkTable);

  for (const rowValues of rawTable.rows) {
    bulkTable.rows.add(...rowValues);
  }

  const bulkRequest = new sql.Request(transaction);
  await bulkRequest.bulk(bulkTable);

  const mergeRequest = new sql.Request(transaction);
  await mergeRequest.batch(`
    insert into dbo.iis_log_import_staging (
      source_server_name,
      source_file_name,
      log_date,
      log_time,
      s_sitename,
      s_computername,
      s_ip,
      cs_method,
      cs_uri_stem,
      cs_uri_query,
      s_port,
      cs_username,
      c_ip,
      cs_user_agent,
      cs_cookie,
      cs_referer,
      sc_status,
      sc_substatus,
      sc_bytes,
      time_taken,
      raw_line
    )
    select
      source_server_name,
      source_file_name,
      log_date,
      try_convert(time(0), log_time),
      s_sitename,
      s_computername,
      s_ip,
      cs_method,
      cs_uri_stem,
      cs_uri_query,
      s_port,
      cs_username,
      c_ip,
      cs_user_agent,
      cs_cookie,
      cs_referer,
      sc_status,
      sc_substatus,
      sc_bytes,
      time_taken,
      raw_line
    from ${stageTableName};

    drop table ${stageTableName};
  `);
}

export async function importIisLogs(args: ImportIisLogsArgs): Promise<void> {
  const runStart = performance.now();

  args.logger.info(
    { inputDir: args.inputDir, archiveDir: args.archiveDir },
    "Starting IIS log import run",
  );

  await mkdir(args.archiveDir, { recursive: true });

  const logFiles = await discoverLogFiles(
    args.inputDir,
    args.archiveDir,
    args.defaultSourceServerName,
  );

  args.logger.info(
    {
      logFiles: logFiles.length,
      defaultSourceServerName: args.defaultSourceServerName,
    },
    "Discovered IIS log files",
  );

  if (logFiles.length === 0) {
    args.logger.info(
      { totalRuntimeMs: performance.now() - runStart },
      "No IIS log files found",
    );
    return;
  }

  for (const logFile of logFiles) {
    const sourceServerName = logFile.sourceServerName;
    const fileName = logFile.fileName;
    const fullPath = logFile.fullPath;

    const fileStart = performance.now();

    const statStart = performance.now();
    const stats = await stat(fullPath);
    const statMs = performance.now() - statStart;

    const hashStart = performance.now();
    const fileHash = await hashFileSha256(fullPath);
    const hashMs = performance.now() - hashStart;

    const duplicateCheckStart = performance.now();
    const duplicateCheckRequest = args.db.request();
    duplicateCheckRequest.input("source_server_name", sql.VarChar(100), sourceServerName);
    duplicateCheckRequest.input("file_hash", sql.VarChar(128), fileHash);
    duplicateCheckRequest.input("file_name", sql.VarChar(260), fileName);
    duplicateCheckRequest.input("file_size", sql.BigInt, stats.size);

    const duplicateCheck = await duplicateCheckRequest.query<{ exists_flag: number }>(`
      select top 1 1 as exists_flag
      from dbo.iis_log_import_file
      where source_server_name = @source_server_name
        and (
             file_hash = @file_hash
             or (file_name = @file_name and file_size = @file_size)
        );
    `);
    const duplicateCheckMs = performance.now() - duplicateCheckStart;

    if (duplicateCheck.recordset.length > 0) {
      const skipTransaction = new sql.Transaction(args.db);

      try {
        await skipTransaction.begin();

        const batchId = await createBatchRecord(
          skipTransaction,
          sourceServerName,
          fileName,
          stats.size,
          "running",
        );

        await completeBatchRecord(skipTransaction, batchId, "skipped", 0, null);
        await skipTransaction.commit();
      } catch (err) {
        try {
          await skipTransaction.rollback();
        } catch {
          // ignore rollback error
        }
        throw err;
      }

      args.logger.warn(
        {
          sourceServerName,
          fileName,
          fileSize: stats.size,
          fileHash,
          statMs,
          hashMs,
          duplicateCheckMs,
          fileTotalMs: performance.now() - fileStart,
        },
        "Skipping already imported file",
      );
      continue;
    }

    args.logger.info(
      {
        sourceServerName,
        fileName,
        fullPath,
        fileSize: stats.size,
        fileHash,
      },
      "Reading IIS log file",
    );

    const parseStart = performance.now();
    const rows = await readIisLogFile(fullPath, fileName);
    const parseMs = performance.now() - parseStart;

    args.logger.info(
      {
        sourceServerName,
        fileName,
        rowCount: rows.length,
        parseMs,
      },
      "Parsed IIS log rows",
    );

    const transaction = new sql.Transaction(args.db);
    let batchId: number | null = null;

    try {
      await transaction.begin();

      const batchCreateStart = performance.now();
      batchId = await createBatchRecord(
        transaction,
        sourceServerName,
        fileName,
        stats.size,
        "running",
      );
      const batchCreateMs = performance.now() - batchCreateStart;

      const rowChunks = chunkArray(rows, INSERT_CHUNK_SIZE);

      args.logger.info(
        {
          sourceServerName,
          fileName,
          rowCount: rows.length,
          chunkCount: rowChunks.length,
          chunkSize: INSERT_CHUNK_SIZE,
        },
        "Beginning chunked staging bulk inserts",
      );

      let totalInsertMs = 0;

      for (const [index, chunk] of rowChunks.entries()) {
        const chunkStart = performance.now();

        await insertStagingRowsBatch(transaction, sourceServerName, chunk);

        const chunkMs = performance.now() - chunkStart;
        totalInsertMs += chunkMs;

        args.logger.debug(
          {
            sourceServerName,
            fileName,
            chunkIndex: index + 1,
            chunkCount: rowChunks.length,
            chunkRowCount: chunk.length,
            chunkMs,
          },
          "Inserted staging bulk chunk",
        );
      }

      const fileRecordStart = performance.now();
      const fileRecordRequest = new sql.Request(transaction);
      fileRecordRequest.input("source_server_name", sql.VarChar(100), sourceServerName);
      fileRecordRequest.input("file_name", sql.VarChar(260), fileName);
      fileRecordRequest.input("file_size", sql.BigInt, stats.size);
      fileRecordRequest.input("file_hash", sql.VarChar(128), fileHash);
      fileRecordRequest.input("row_count", sql.Int, rows.length);

      await fileRecordRequest.query(`
        insert into dbo.iis_log_import_file (
          source_server_name,
          file_name,
          file_size,
          file_hash,
          row_count
        )
        values (
          @source_server_name,
          @file_name,
          @file_size,
          @file_hash,
          @row_count
        );
      `);
      const fileRecordMs = performance.now() - fileRecordStart;

      const batchCompleteStart = performance.now();
      await completeBatchRecord(transaction, batchId, "completed", rows.length, null);
      const batchCompleteMs = performance.now() - batchCompleteStart;

      const commitStart = performance.now();
      await transaction.commit();
      const commitMs = performance.now() - commitStart;

      args.logger.info(
        {
          sourceServerName,
          fileName,
          fileSize: stats.size,
          rowCount: rows.length,
          statMs,
          hashMs,
          duplicateCheckMs,
          parseMs,
          batchCreateMs,
          insertTotalMs: totalInsertMs,
          fileRecordMs,
          batchCompleteMs,
          commitMs,
          fileTotalMs: performance.now() - fileStart,
        },
        "Imported IIS log file successfully",
      );
    } catch (err) {
      try {
        await transaction.rollback();
      } catch {
        // ignore rollback error
      }

      const message =
        err instanceof Error ? err.message : "Unknown import failure";

      if (batchId !== null) {
        try {
          const failedBatchRequest = args.db.request();
          failedBatchRequest.input("id", sql.BigInt, batchId);
          failedBatchRequest.input("error_message", sql.VarChar(sql.MAX), message);

          await failedBatchRequest.query(`
            update dbo.iis_log_import_batch
            set
              status = 'failed',
              error_message = @error_message,
              completed_at = sysutcdatetime()
            where id = @id;
          `);
        } catch {
          // ignore secondary logging failure
        }
      }

      args.logger.error(
        {
          sourceServerName,
          fileName,
          fileSize: stats.size,
          fileHash,
          fileTotalMs: performance.now() - fileStart,
          err,
        },
        "Failed importing IIS log file",
      );

      throw err;
    }

    await mkdir(logFile.archiveDir, { recursive: true });

    const archiveStart = performance.now();
    const archivedFileName = buildArchivedFileName(fileName, fileHash);
    await rename(fullPath, join(logFile.archiveDir, archivedFileName));
    const archiveMs = performance.now() - archiveStart;

    args.logger.info(
      {
        sourceServerName,
        fileName,
        archivedFileName,
        archiveDir: logFile.archiveDir,
        archiveMs,
      },
      "Archived processed IIS log file",
    );
  }

  args.logger.info(
    { totalRuntimeMs: performance.now() - runStart },
    "Completed IIS log import run",
  );
}