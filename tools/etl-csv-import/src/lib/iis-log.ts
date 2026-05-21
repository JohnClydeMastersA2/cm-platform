import { readFile } from "node:fs/promises";

export type IisLogRow = {
  sourceFileName: string;
  rawLine: string;

  date: string | null;
  time: string | null;

  s_sitename: string | null;
  s_computername: string | null;
  s_ip: string | null;
  cs_method: string | null;
  cs_uri_stem: string | null;
  cs_uri_query: string | null;
  s_port: string | null;
  cs_username: string | null;
  c_ip: string | null;
  cs_user_agent: string | null;
  cs_cookie: string | null;
  cs_referer: string | null;
  sc_status: string | null;
  sc_substatus: string | null;
  sc_bytes: string | null;
  sc_win32_status: string | null;
  time_taken: string | null;
};

function tokenizeW3cLine(line: string): string[] {
  return line.trim().split(/\s+/);
}

export async function readIisLogFile(
  filePath: string,
  sourceFileName: string,
): Promise<IisLogRow[]> {
  const content = await readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  let fields: string[] = [];
  const rows: IisLogRow[] = [];

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) continue;

    if (line.startsWith("#Fields:")) {
      fields = line.replace(/^#Fields:\s*/, "").split(/\s+/);
      continue;
    }

    if (line.startsWith("#")) {
      continue;
    }

    if (fields.length === 0) {
      continue;
    }

    const values = tokenizeW3cLine(line);
    const map = new Map<string, string>();

    for (let i = 0; i < fields.length; i++) {
      const fieldName = fields[i];
      if (!fieldName) {
      continue;
      }
    map.set(fieldName, values[i] ?? "");
    }

    const get = (name: string): string | null => {
      const v = map.get(name);
      if (!v || v === "-") return null;
      return v;
    };

rows.push({
  sourceFileName,
  rawLine: raw,

  date: get("date"),
  time: get("time"),

  s_sitename: get("s-sitename"),
  s_computername: get("s-computername"),
  s_ip: get("s-ip"),
  cs_method: get("cs-method"),
  cs_uri_stem: get("cs-uri-stem"),
  cs_uri_query: get("cs-uri-query"),
  s_port: get("s-port"),
  cs_username: get("cs-username"),
  c_ip: get("c-ip"),
  cs_user_agent: get("cs(User-Agent)"),
  cs_cookie: get("cs(Cookie)"),
  cs_referer: get("cs(Referer)"),
  sc_status: get("sc-status"),
  sc_substatus: get("sc-substatus"),
  sc_bytes: get("sc-bytes"),
  sc_win32_status: get("sc-win32-status"),
  time_taken: get("time-taken"),
  });
  }

  return rows;
}