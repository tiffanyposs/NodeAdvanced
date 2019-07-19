const express = require('express');
const crypto = require('crypto');
const app = express();
const Worker = require('webworker-threads').Worker;

app.get('/', (req, res) => {
  const worker = new Worker(function() {
    // this will NOT have access to any variables outside of it
    // since it gets stringified
    this.onmessage = function() {
      // work goes here
      let counter = 0;
      while (counter < 1e9) {
        counter++;
      }
      postMessage(counter);
    }
  });

  worker.onmessage = function(message) {
    console.log('data: ', message.data);
    res.send('' + message.data);
  }

  worker.postMessage();
});

app.get('/slow', (req, res) => {
  let counter = 0;
  while (counter < 1e9) {
    counter++;
  }
  res.send('' + counter);
})

app.listen(3000);

console.log("You're listening on port 3000");
