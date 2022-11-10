const express = require("express");
const path = require('path');

const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
app.use(require("./routes/record"));
app.use(require("./routes/analytics"));

// get driver connection
const dbo = require("./db/conn");


if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, 'client/build')));
    
  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

app.get('/', function (req, res) {
  res.send('Server for zChain Analytics');
});

app.listen(port, async () => {
  // perform a database connection when server starts
  await dbo.connectToServer();
  console.log(`Server is running on port: ${port}`);
});