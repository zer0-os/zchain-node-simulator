const express = require("express");
const ipFetch = require("ip-fetch");

// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const recordRoutes = express.Router();

// This will help us connect to the database
const dbo = require("../db/conn");

async function addGeoLocation(records, db_connect) {
  const collection = db_connect.collection(process.env.COLLECTION_NAME);

  if (records) {
    const data = [];
    for (const network of records) {
      
      // if already present don't fetch location again, just push and continue
      if (network.geoLocation && network.geoLocation?.query === network.ip) { 
        data.push(network);
        continue; 
      }

      try {
        const info = await ipFetch.getLocationNpm(network.ip);
        if (typeof info === "string") { continue; } // for invalid/private ipv4 addresses

        //await delay(500); // to avoid too many requests
        
        const dataWithGeoLocation = { 
          ...network, 
          geoLocation: info
        };
        data.push(dataWithGeoLocation);
        
        // update collection with geolocation
        await collection.findOneAndUpdate(
          { "peerId": network.peerId }, // filter
          { $set: { ...dataWithGeoLocation } } // atomic operation req. for update
        );
      } catch (error) {
        console.log("error ", error);
      }
    }

    return data;
  }
  return records;
}

// This section will help you get a list of all the records.
recordRoutes.route("/networks").get(async function (req, res) {
  let db_connect = dbo.getDb("ZChain");
  if (db_connect === undefined) {
    return;
    // await dbo.connectToServer();
    // db_connect = dbo.getDb("ZChain");
  }

  db_connect
    .collection(process.env.COLLECTION_NAME)
    .find({})
    .toArray(async function (err, result) {
      if (err) throw err;
      res.json(await addGeoLocation(result, db_connect));
    });
});


module.exports = recordRoutes;
