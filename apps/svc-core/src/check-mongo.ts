import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGODB_URI?.trim();
const databaseName = process.env.MONGODB_DATABASE?.trim() || "CMPlatformDocuments";

if (!mongoUri) {
  console.error("MONGODB_URI is required");
  process.exitCode = 1;
} else {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const database = client.db(databaseName);
    await database.command({ ping: 1 });
    console.log(`MongoDB connection check passed: database=${databaseName}`);
  } finally {
    await client.close();
  }
}
