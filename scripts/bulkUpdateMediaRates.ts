import { ObjectId } from 'mongodb'
const MongoClient = require('mongodb').MongoClient
const mongoUrl = process.env.DB_MONGO_MEDIA


 // for single rate update
 const fixOneMediaRatesData = async (db) => {
    let mediaRatesDb = db.collection('media_rates')
    const rate = await mediaRatesDb.findOne({ _id: new ObjectId('') })
    
      // Check if 'InitialPubRate' field exists
    if (!rate.hasOwnProperty('InitialPubRate')) {
      // Set 'InitialPubRate' to the current value of 'PublisherRate'
      rate.InitialPubRate = rate.PublisherRate;
    
      // Update the 'PublisherRate' field to be the current 'InitialPubRate' * 1.3, rounded to the nearest decimal
      rate.PublisherRate = Math.round(rate.InitialPubRate * 1.3 * 10) / 10;
    
      // Update the document in the database
      await mediaRatesDb.updateOne(
        { _id: rate._id },
        {
          $set: {
            InitialPubRate: rate.InitialPubRate,
            PublisherRate: rate.PublisherRate
          }
        }
  );

  console.log("Updated document:");
} else {
  console.log("'InitialPubRate' field already exists, no update needed.");
}
 } 
// for bulk updates
 const fixAllMediaRatesData = async (db) => {
    // connect to mediaRates DB
    const mediaRatesDb = db.collection('media_rates')
    // Fetch all documents in the 'media_rates' collection
    const Rates = await mediaRatesDb.find({}).toArray()
    // Iterate through each record and update if necessary
    for (const rate of Rates) {
      // Check if 'InitialPubRate' field exists
      if (!rate.hasOwnProperty('InitialPubRate')) { 
        // Set 'InitialPubRate' to the current value of 'PublisherRate'
        rate.InitialPubRate = rate.PublisherRate
    
        // Update the 'PublisherRate' field to be the current 'InitialPubRate' * 1.3 i.e synkd 30%, rounded to the nearest decimal
        rate.PublisherRate = Math.round(rate.InitialPubRate * 1.3 * 10) / 10;
    
        // Update the document in the database
        await mediaRatesDb.updateOne(
          { _id: rate._id },
          {
            $set: {
              InitialPubRate: rate.InitialPubRate,
              PublisherRate: rate.PublisherRate
            }
          }
        );
    
        console.log(`Updated InitialPubRate: ${rate._id}`);
      } else {
        console.log(`InitialPubRate already exists for: ${rate._id}, no update needed.`);
      }
    }
    
    console.log("All records updated.");
 }

const init = async () => {
    // initialise mongo
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true })
    if (!client) {
        console.log("Can't connect")
        return
    }
    console.log('Connected to Mongo...')
    // connect to DB
    const db = client.db('synkd-trial101')
    console.log('Connected to DB...')

    console.log('rate updates for media_rates in our database...')
    await fixAllMediaRatesData(db)
}

init().then(() => {
    console.log('Finished applying updates... Exiting...')
    process.exit(0)
})