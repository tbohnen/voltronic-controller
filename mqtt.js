var mqtt = require('mqtt')
const options = require('./options')
const { emitter } = require('./commands')

const publish = (topic, msg) => {
	client.publish(topic, msg)
}

let client

const init = () => {
	console.log('client connecting')
	client = mqtt.connect(`mqtt://${options.server}:${options.port}`, {
		"username": options.username,
		"password": options.password
	})

	client.on('connect', function (e) {
		console.log('mqtt connected')
		options.mqttSensors.forEach(sensor => {
		   client.subscribe(`${sensor.topic}/#`, function (err) {
		 	      if (err) { console.log('could not subscribe', err); }
		 	  else {
					console.log('subscribed', sensor.topic);
		 	  }
		  })
		})
	})

	client.on('message', function (topic, message) {
	  const sensor = options.mqttSensors.find( s => s.topic === topic.split('/')[0])

		console.log(`incoming mqtt message: ${topic} ${message}`, sensor)
	  emitter.emit('sensor', { sensor, topic, message })
	})
}

module.exports = {
	publish,
	init
}