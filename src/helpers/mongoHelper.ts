import { MongoClient } from "mongodb"

/**
 * Connect to the media database (DB_MONGO_MEDIA).
 * @returns MongoClient
 */
export const connectMedia = async () => {
const options = {
      serverSelectionTimeoutMS: 100000, // Increase to 100 seconds
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 50, // Increase this number based on your needs
      minPoolSize: 5,
      socketTimeoutMS: 45000
  };
  
    const client = await MongoClient.connect(process.env.DB_MONGO_MEDIA, options)

    return client
}

const client = new MongoClient(process.env.DB_MONGO_MEDIA)

client.connect().then(_=>_);
export const db = client.db('synkd-trial101')
export const mediaDB = client.db('media')

export const mediaReportCacheDB = client.db('mediaReportCache')