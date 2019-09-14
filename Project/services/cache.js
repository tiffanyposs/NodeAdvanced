const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || '');
  return this;
}

mongoose.Query.prototype.exec = async function() {
  // if the useCache property is false
  // just return the query
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }

  // get mongoose collection name
  const collection = this.mongooseCollection.name;

  // create the key to check redis with the query and collection name
  const key = JSON.stringify({
    ...this.getQuery(),
    collection
  });

  // check redis for the key
  const cacheValue = await client.hget(this.hashKey, key);

  // if redis had the cached value from the key
  if (cacheValue) {
    // convert to an Object/Array
    const doc = JSON.parse(cacheValue);
    // hydrate the values with the model since the cached value is not
    // a mongoose document
    // iterate if it's an array, hydrate object if not an array
    return Array.isArray(doc)
      ? doc.map(d => new this.model(d))
      : new this.model(doc);

    // return the cached value
    return doc;
  }

  // get the value from the database
  const result = await exec.apply(this, arguments);

  // save that value to redis as JSON
  // cache for 10 seconds
  client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10);

  return result;
}


module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  }
}
