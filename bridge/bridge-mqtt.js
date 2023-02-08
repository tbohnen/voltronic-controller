var mqtt = require('mqtt')
const options = require('./options')

const publish = (topic, msg) => {
	//console.log(`publishing ${topic}`, msg)
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
		})
	}

module.exports = {
	publish,
	init
}
