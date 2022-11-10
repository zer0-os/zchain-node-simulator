const express = require("express");
const dbo = require("../db/conn");
const analyticsRoutes = express.Router();

analyticsRoutes.route("/zchain/analytics").post(async function (req, response) {
    const data = req.body;
    let db_connect = dbo.getDb(process.env.DB_NAME);

    const collection = db_connect.collection(process.env.COLLECTION_NAME);
  
    const sourceIP = req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      null;
  
    const nodeData = await collection.findOne({
      "peerId": data.peerId,
    });
  
    if (nodeData === null) {
      // create new entry for node data in db
      console.info("Creating new entry for node: ", data.peerId);
      await collection.insertOne({
        "ip": sourceIP,
        "messages": [
          {
            "message": data.message,
            "channel": data.channel,
            "network": data.network
          }
        ],
        "peerId": data.peerId,
        "version": data.version,
        "os": data.os,
        "storage": data.storage,
        "timestamp": data.timestamp,
        "status": data.status
      });
    }
    else {
      // else update entry for existing node data
      console.info("Updating existing entry for node: ", data.peerId);
      const updatedData = {
        "ip": sourceIP,
        "messages": [
          ...nodeData.messages ?? [],
          {
            "message": data.message,
            "channel": data.channel,
            "network": data.network
          }
        ],
        "version": data.version,
        "os": data.os,
        "storage": data.storage,
        "timestamp": data.timestamp,
        "status": data.status
      }
  
      await collection.findOneAndUpdate(
        { "peerId": data.peerId }, // filter
        { $set: { ...updatedData } } // atomic operation req. for update
      );
    }
  
    response.send(req.body);
});


module.exports = analyticsRoutes;
