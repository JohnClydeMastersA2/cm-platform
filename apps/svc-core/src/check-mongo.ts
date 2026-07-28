import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGODB_URI?.trim();
const databaseName = process.env.MONGODB_DATABASE?.trim() || "CMPlatformDocuments";
const deniedDatabaseName = process.env.MONGODB_DENIED_DATABASE?.trim();
const requireReadWrite = process.env.MONGODB_REQUIRE_READ_WRITE?.trim().toLowerCase() === "true";

if (!mongoUri) {
  console.error("MONGODB_URI is required");
  process.exitCode = 1;
} else {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const database = client.db(databaseName);
    await database.command({ ping: 1 });

    if (requireReadWrite) {
      const collectionName = `__cm_platform_connection_check_${randomUUID().replaceAll("-", "")}`;
      const collection = database.collection(collectionName);

      try {
        await collection.insertOne({ checkedAt: new Date() });
      } finally {
        await collection.drop().catch(() => undefined);
      }
    }

    if (deniedDatabaseName) {
      try {
        await client
          .db(deniedDatabaseName)
          .collection("__cm_platform_access_check")
          .findOne({});
        throw new Error(
          `MongoDB isolation check failed: ${databaseName} credential can read ${deniedDatabaseName}`
        );
      } catch (error) {
        const errorCode =
          typeof error === "object" && error !== null && "code" in error
            ? Number(error.code)
            : undefined;
        const errorMessage =
          error instanceof Error ? error.message.toLowerCase() : "";
        const isAuthorizationDenied =
          errorCode === 13 ||
          (errorCode === 8000 &&
            errorMessage.includes("not allowed to do action"));

        if (!isAuthorizationDenied) {
          throw error;
        }
      }
    }

    console.log(`MongoDB connection check passed: database=${databaseName}`);

    if (requireReadWrite) {
      console.log(`MongoDB read/write check passed: database=${databaseName}`);
    }

    if (deniedDatabaseName) {
      console.log(
        `MongoDB isolation check passed: database=${databaseName}, deniedDatabase=${deniedDatabaseName}`
      );
    }
  } finally {
    await client.close();
  }
}
