var mqtt = require('mqtt')
const { executeRaw, getStatus } = require('./commands')
const options = require('./options')

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
		//   client.subscribe(options.commandsTopic, function (err) {
		// 	      if (err) { console.log('could not subscribe', err); }
		// 	  else { 
		// 		console.log('subscribed', options.commandsTopic);
		// 	  }
		// 	    })
	})

	client.on('message', function (topic, message) {
		console.log(`incoming mqtt message: ${topic} ${message}`)
	})
}

module.exports = {
	publish,
	init
}