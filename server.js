const express = require('express');
const app = express();
const lisingsData = require('./listingsData.json');
const PORT = process.env.PORT || 8080;

// set the view engine to ejs
app.set('view engine', 'ejs');

// index page
app.get('/', function(req, res) {
  res.render('pages/index', { lisingsData });
});

app.listen(PORT);
console.log('Server started on port 8080');
