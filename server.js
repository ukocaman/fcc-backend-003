'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns')

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGOLAB_URI, {
  useMongoClient: true
})
.then(console.log('MongoDB connected...'))
.catch(err => console.log(err))

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

// Url schema
const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true,
    // unique: true
  },
  short_url: {
    type: String,
    required: true,
    // unique: true
  }
})
// Counter schema
const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true
  }
})

// Url model
const Url = mongoose.model('Url', urlSchema);
// Counter model
const Counter = mongoose.model('Counter', counterSchema);
      
//POST /new
app.post('/api/shorturl/new', (req, res) => {
  let original_url = req.body.url
  // sanitize url
  const regex = /^https?:\/\//
  original_url = regex.test(original_url) ? original_url.replace(regex, '') : original_url
  original_url = original_url.toLowerCase()
  
  dns.lookup(original_url, (error, address, family) => {
    if(error) {
      res.json({ "error": "invalid URL" })
    } else {
      Url.findOne({ original_url })
      .then(url => {
        if(url) { // url is already in the db!
          res.json({ original_url, short_url: url.short_url })
        } else { // new url
          Counter.findOne({ name: 'short_url' })
          .then(counter => { // get the counter for short_url and increase it by 1
            let short_url = counter.value.toString()
            counter.value = counter.value + 1
            counter.save()
            .then(
              new Url({ original_url, short_url })
              .save()
              .then(url => {
                res.json({ original_url, short_url })
              })
            )   
          })
        }
      })
    }
  })     
 })

// GET /:short_url
app.get('/api/shorturl/:short_url', (req, res) => {
  let short_url = req.params.short_url
  Url.findOne({ short_url })
  .then(url => {
    if(url) {
      res.redirect(`http://${url.original_url}`)
    } else {
      res.send(`Short URL ${short_url} is not found!`)
    }
  })
})

app.listen(port, function () {
  console.log('Node.js listening ...');
});