const https =  require('https');
const crypto = require('crypto');
const fs = require('fs');

const start = Date.now();

function doRequest() {
  https.request('https://www.google.com', res => {
    res.on('data', () => {});
    res.on('end', () => {
      console.log('HTTPS: ', Date.now() - start);
    });
  }).end();
}

function doHash() {
  crypto.pbkdf2('a', 'b', 100000, 512, 'sha512', () => {
    console.log('HASH: ', Date.now() - start);
  });
}

// async
doRequest();

// async
fs.readFile('multitask.js', 'utf8', () => {
  console.log('FS: ', Date.now() - start);
});

// threads
doHash();
doHash();
doHash();
doHash();
doHash(); // TAKES LONGER BECAUSE USES AN ADDITIONAL THREAD
