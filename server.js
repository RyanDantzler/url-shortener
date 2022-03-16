require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const UrlSchema = new mongoose.Schema({
  url: { type: String, required: true },
  id: { type: Number }
});

UrlSchema.plugin(AutoIncrement, { inc_field: 'id' });
let UrlModel = mongoose.model("Url", UrlSchema);

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

const checkHostname = async (hostname) => {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, (err, val) => {
      console.log("checking hostname: " + hostname);
      if (err) reject(err);
      
      resolve(val);
    }); 
  });
};

app.get('/api/shorturl/:id', (req, res) => {
  UrlModel.findOne({ id: req.params.id }, (err, data) => {
    if (err) {
      console.log(err);
      res.json({ error: err });
    } else if (data) {
      res.redirect(data.url);
    } else {
      res.json({ error: "No short URL found for the given input" });
    }
  });
});

app.post('/api/shorturl', async (req, res) => {
  let validUrl = /^https?:\/\/\w+\.\w+/;
  console.log("validating url");
  if (validUrl.test(req.body.url)) {
    let url = new URL(req.body.url);
    //let hostname = req.body.url.split(req.body.url.match(/^https?:\/\//)).pop();
    try {
      if (await checkHostname(url.host)) {
        UrlModel.exists({ url: url.href }, (err, data) => {
          console.log("searching for existing document");
          if (err) return console.log(err);
          if (data) {
            console.log("document found");
            console.log(data);
            UrlModel.findById({ "_id": data._id }, (err, data) => {
              if (err) return console.log(err);
              if (data) {
                res.json({ original_url: data.url, short_url: data.id });
              } else {
                res.status(404).end('Not found');
              }
            });
          } else {
            console.log("document not found");
            UrlModel.create({ url: url.href }, (err, data) => {
              console.log("creating document");
              if (err) return console.log(err);
              
              res.json({ original_url: data.url, short_url: data.id });
            });
          }
        });
      } else
        throw "invalid hostname";
    } catch (err) {
      console.error(err);
      res.json({ error: "Invalid Hostname" });
    }
  } else {
    res.json({ error: "Invalid URL" });
  }
});

app.use(function (req, res) {
    res.status(404).end('Not found');
});

const port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
