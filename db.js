const Datastore = require('nedb')
const config = require('./options')
const { emitter } = require('./commands')

const solarDb = new Datastore({ filename: config.db.solarDbPath, autoload: false, timestampData: true, onload: function(err) { if (err) console.log('error loading solar db', err); else console.log('loaded solar db'); } });
const sensorsDb = new Datastore({ filename: config.db.sensorDbPath, autoload: false, timestampData: true, onload: function(err) { if (err) console.log('error loading solar db', err); else console.log('loaded sensors'); } });
const eventsDb = new Datastore({ filename: config.db.eventsDbPath, autoload: false, timestampData: true , onload: function(err) { if (err) console.log('error loading solar db', err); else console.log('loaded events db'); } });

const tables = {
  "solar": solarDb,
  "sensors": sensorsDb,
  "events": eventsDb
}

const insert = (doc, tableName) => {
  return new Promise((resolve, reject) => {
      tables[tableName].insert(doc, function (err, newDoc) {
          if (err) {
            reject(err)
          } else {
            resolve(newDoc)
          }
          });
      })
}

const get = (query, tableName, skip, limit) => {
return new Promise((resolve, reject) => { 
console.log(`getting ${tableName} - ${skip} - ${limit} `, query)
  tables[tableName].find(query).sort({ time: -1 }).skip(skip).limit(limit).exec(function(err, docs) {
      if (err) reject(err)

      else {
      resolve(docs)
      }
});
})
}

emitter.on("sensor", (sensor) => {
    //insert(sensor, "sensors")
})

emitter.on("status", (status) => {
    //insert(status, "solar")
})

emitter.on("event", (event) => {
    insert(event, "events")
})

module.exports = {
  insertSolar: (doc) => { return insert(doc, "solar") },
  insertSensor: (doc) => { return insert(doc, "sensors") },
  insertEvent: (doc) => { return insert(doc, "events") },
  getSolar: (query, skip, limit) => { return get(query, "solar", skip, limit) },
  getSensors: (query, skip, limit) => { return get(query, "sensors", skip, limit) }
}
