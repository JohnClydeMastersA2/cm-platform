import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function hashFileSha256(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}