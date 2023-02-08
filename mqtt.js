var mqtt = require('mqtt')
const options = require('./options')
const sensors = require('./sensors')


const publish = (topic, msg) => {
	console.log(`publishing ${topic}`, msg)
	if (msg) { client.publish(topic, msg) }
	else { client.publish(topic) }
}

let client

const init = () => {
	if (!options.username) {
		console.log("no username, not connecting mqtt")
		return
	}


	
  console.log(`client connecting ${options.username} to ${options.server}:${options.port}`)
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
				  if (sensor.type === "POWR2") {
					  publish(`${sensor.topic}/cmnd/POWER`, "")
				  }
				  if (sensor.type === "POW") {
					  publish(`${sensor.topic}/cmnd/POWER`, "")
				  }
		 	  }
		  })
		})
	})

	client.on('message', function (topic, message) {
	  const sensor = options.mqttSensors.find( s => s.topic === topic.split('/')[0])
	    sensors.update(sensor, topic, message)
	})


setInterval(() => {
    publish(`tasmota/cmnd/POWER`, "")
}, 60000)


}

module.exports = {
	publish,
	init
}
