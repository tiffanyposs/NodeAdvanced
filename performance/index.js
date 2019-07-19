// I'm a child, i'm going to act like a server
// and do nothing else
const express = require('express');
const crypto = require('crypto');
const app = express();


app.get('/', (req, res) => {
  crypto.pbkdf2('a', 'b', 100000, 512, 'sha512', () => {
    res.send('Hello');
  });
});

// when you have the clusters, this page doesn't get delayed
// by the loading of the above page
app.get('/fast', (req, res) => {
  res.send('This was fast');
});

app.listen(3000);

console.log("You're listening on port 3000");
