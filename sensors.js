const { emitter } = require('./commands')
  const options = require('./options')
const sensors = options.mqttSensors.map(s => ({ ...s, latestMessages: { }, power: null }))

  const getSensor = (name) => {
    const index = sensors.findIndex(s => s.name == name)
      return sensors[index]
  }

const update = (incomingSensor, topic, messageBuffer) => {
  const message = messageBuffer.toString('utf-8')
    const index = sensors.findIndex(s => s.name == incomingSensor.name)
    const sensor = sensors[index]
    if (!sensor) {
      console.error("Could not find sensor", incomingSensor)
        return
    }

  sensor.latestMessages[topic] = message

    if (sensor.type === "pooltemp") {
      console.log('current pool temp', message);
      sensor.temp = Number(message);
    }

    if (sensor.type === "POWR2") {
      const topicSplit = topic.split("/")

        if (topicSplit.length === 3 && topicSplit[1] === "stat" && topicSplit[2] == "POWER") {
          sensor.power = message.toUpperCase() == "ON"
        }

        if (topicSplit.length === 3 && topicSplit[1] === "tele" && topicSplit[2] == "SENSOR") {
          try {
            const parsed = JSON.parse(message)
              sensor.current = Number(parsed.ENERGY.Current)
              sensor.todayWatts = Number(parsed.ENERGY.Today)
              if (sensor.current === 0 && sensor.power) {
                sensor.noCurrentDrawTime = Date.now()
              }
          }
          catch (e) {
            console.error(e);
          }

        }
    }
  emitter.emit('sensor', sensor)
}

module.exports = {
  sensors,
  update,
  getSensor 
}
