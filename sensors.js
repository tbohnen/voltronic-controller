const { emitter } = require('./commands')
const options = require('./options')
const sensors = options.mqttSensors.map(s => ({ ...s, latestMessages: { }, power: null }))

const update = (incomingSensor, topic, messageBuffer) => {
    const message = messageBuffer.toString('utf-8')
    const index = sensors.findIndex(s => s.name == incomingSensor.name)
    const sensor = sensors[index]
    if (!sensor) {
      console.error("Could not find sensor", incomingSensor)
      return
    }

    sensor.latestMessages[topic] = message

    if (sensor.type === "POWR2") {
      const topicSplit = topic.split("/")

      switch (topicSplit[2]) {
        case "SENSOR": {
          const parsed = JSON.parse(message)
          sensor.power = parsed.Power && Number(parsed.Power) === 1 ? "On" : "Off"
          break;
        }
      }
    }


      console.log(`incoming mqtt message: ${topic} ${message}`, sensor)
      emitter.emit('sensor', sensor)
}


module.exports = {
  sensors,
  update
}
