const { MongoClient } = require("mongodb");
const Db = process.env.ATLAS_URI;
const client = new MongoClient(Db, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

var _db;
 
module.exports = {
  connectToServer: async function (callback) {
    const db = await client.connect();
    if (db) {
      _db = db.db("ZChain");
      console.log("Successfully connected to MongoDB."); 
    }
  },
 
  getDb: function () {
    return _db;
  },
};