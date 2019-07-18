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
