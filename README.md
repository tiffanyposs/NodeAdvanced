# Advanced Node

These are notes for the "Node JS: Advanced Concepts" class by Stephen Grider [See Class Here](https://www.udemy.com/advanced-node-for-developers/)

## How it works

* Node allows you to work in JavaScript instead of C++
* Node uses `libuv` and `V8` to allow you to work

## Event Loop

### How does the event loop work?

Sudo code for event loop

```js
// node myFile.js

const pendingTimers = [];
const pendingOSTasks = [];
const pendingOperations = [];

// new timers, tasks, operations are recorded from myFile running
myFile.runContents();

function shouldContinue() {
  // Check one: Any pending setTimeout, setInterval, setImmediate?
  // Check two: Any pending OS tasks? Like server listening to a port
  // Check three: Any pending long running operations? (Like fs module)
  return pendingTimers.length || pendingOSTasks.length || pendingOperations.length;
}

// tick
while (shouldContinue) {
  // 1) Node looks at pendingTimers and sees if any functions
  // are ready to be called. setTimeout, setInterval

  // 2) Node loops at pendingOSTasks and pendingOperations
  // and calls relevant callbacks

  // 3) Pause execution. Continue when...
  // - a new pendingOSTasks is done
  // - a new pendingOperation is done
  // - a timer is about to complete

  // 4) Look at pendingTimers. Call any setImmediate

  // 5) Handle and 'close' events
}


// exit back to terminal
```

### Node Is Not Single Threaded

Many people think Node.js is single threaded, but it is not. It actually has a `Thread Pool` of 4 additional threads allocated for certain expensive methods in Node. So, there is the main thread plus 4 extra threads in the `Thread Pool`.

In the below example, you can see the 4 threads in action. the `pbkdf2` method in Node is allocated to one of the extra 4 threads in the `thread pool`. The main thread is the whole script itself, then the first 4 calls to `pbkdf2` take up the 4 threads and take about 1 second to complete. Since there is a 5th call to `pbkdf2` (which is above the 4 thread limit in the `thread pool`), this one is delayed until one of the 4 threads is freed-up by the other tasks completing in the extra threads, ultimately taking about double the time as the others to complete.

Keep in mind that even though it's multi-threaded, the processing time becomes slower than doing one because the system has to split the workload for all 4 threads. So, they run at the same time but slower.

```js
const crypto =  require('crypto');

const start = Date.now();

// Thread One
crypto.pbkdf2('a', 'b', 100000, 512, 'sha512', () => {
  console.log('1: ', Date.now() - start);
});

// Thread Two
crypto.pbkdf2('a', 'b', 100000, 512, 'sha512', () => {
  console.log('2: ', Date.now() - start);
});

// Thread Three
crypto.pbkdf2('a', 'b', 100000, 512, 'sha512', () => {
  console.log('3: ', Date.now() - start);
});

// Thread Four
crypto.pbkdf2('a', 'b', 100000, 512, 'sha512', () => {
  console.log('4: ', Date.now() - start);
});

// Waits for one of the other threads to finish
crypto.pbkdf2('a', 'b', 100000, 512, 'sha512', () => {
  console.log('5: ', Date.now() - start);
});
```

You can also control how many threads your Node application uses with adding this line of code at the top, in this case changing the threads to 5.

```js
process.env.UV_THREADPOOL_SIZE = 5;
```

### Async Code

Some tasks are async and do not use the threads, which methods that use async depend on your OS. In the below example on a mac, the OS is the one that ultimately make the HTTP request in an async fashion, so all of these tasks execute at the same time in more or less the same amount of time.

```js
const https =  require('https');

const start = Date.now();

function doRequest() {
  https.request('https://www.google.com', res => {
    res.on('data', () => {});
    res.on('end', () => {
      console.log(Date.now() - start);
    });
  }).end();
}

doRequest();
doRequest();
doRequest();
doRequest();
doRequest();
doRequest();
doRequest();
doRequest();
doRequest();
```

## Enhancing Node Performance


### Long Processes

The below code fakes long running work to be done, on every request to the `/` in the browser, `doWork` takes 5 seconds to execute. Since this code is part of the event loop it will delay the load of multiple page loads by 5 seconds. So, if you were to get 4 requests at once, the delay could be around 20 seconds for the last user.

```js
const express = require('express');
const app = express();

// fakes a long process in the event loop
function doWork(duration) {
  const start = Date.now();
  while(Date.now() - start < duration) {}
}

app.get('/', (req, res) => {
  doWork(5000); // delays response even on multiple pages
  res.send('Hello');
});

app.listen(3000);
console.log("You're listening on port 3000");
```

### Clustering

Clustering is a way to mitigate long running processes by spinning up `workers` of the same node program. The main program (the first time you run your file) is the `cluster manager`. Within that file you are going write some code that runs the same file again, which creates a `worker`.

Below is a quick example on how to spin up workers using the `cluster.fork()` method to spin up workers. The below example has 1 `cluster manager` and one `worker`. You can use the `cluster.isManager` property to check if the cluster is the `cluster manager`

```js
const cluster = require('cluster');

if (cluster.isMaster) {
  // workers
  cluster.fork();
  cluster.fork();
} else {
  const express = require('express');
  const app = express();


  app.get('/', (req, res) => {
    res.send('Hello World')
  });

  app.listen(3000);
}
```

The recommendation is to match the number of clusters you have to the number of physical cores or logical cores your system is using. You will have diminishing returns the more clusters/workers you spin up on your server.

Read more about that [here](https://superuser.com/questions/1101311/how-many-cores-does-my-mac-have)

#### Setting up Workers without Cluster

The below package allows you to setup workers on any application without using the cluster module from the previous section. This package is often used in production environments.

Cluster Management Package:

* Repo: [PM2](https://github.com/Unitech/pm2)
* Site: [PM2](https://pm2.io/)

```
$ npm install -g pm2
```

Once you install you can start your server something like this, it will automatically start up the appropriate amount of clusters for your machine. Specifically the `-i 0` tells `pm2` that we want it to decide how many workers to spin up.

```
$ pm2 start index.js -i 0
```

This will spin up an appropriate amount of clusters for your computer's cores.

To kill the server/workers

```
$ pm2 delete index
```

To see all the instances running and their health:

```
$ pm2 list
```

To view a particular project details

```
$ pm2 show index
```

To monitor what's going on run the below command. You can use the up and down arrows to go through the processes and you can use the right arrow to see more about the logs.

```
$ pm2 monit
```

### Apache Benchmark - Testing Speed of Clusters

You can use `Apache Benchmark` to make fake requests to your server to test the timing. It comes installed on MacOS under the command `ab`

Below is an example of making requests:

"Use Apache Benchmark to ping localhost:3000/fast 500 times trying to make sure 50 are always running at the same time"

```
$ ab -c 50 -n 500 localhost:3000/
```

### Worker Threads

This is an experimental way to improve performance. This package is mostly useful for forcing complex business logic to use a thread. As mentioned in previous sections, many Node methods use threads by default, so this package will not be useful in those cases.

[NPM - webworker-threads](https://www.npmjs.com/package/webworker-threads)

This package creates a worker that you can communicate with using a `postMessage` and `onmessage` system. Your main application does not have access to the variables inside of the worker code.

Below you can see a working example. We create a while loop to mimic some business logic that needs to happen. you can see that the worker waits for the on message to execute. The run times for this had a mean time of `10,797ms` while the same while loop w/o the worker had a mean time of `24,404ms`


```js
...
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
...
```
