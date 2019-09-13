const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
client.get = util.promisify(client.get);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.exec = async function() {
  // get mongoose collection name
  const collection = this.mongooseCollection.name;

  // create the key to check redis with the query and collection name
  const key = JSON.stringify({
    ...this.getQuery(),
    collection
  });

  // check redis for the key
  const cacheValue = await client.get(key);

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
  client.set(key, JSON.stringify(result));

  return result;
}
