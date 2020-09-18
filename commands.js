const { exec } = require('child_process');
const { EventEmitter } = require("events");
const emitter = new EventEmitter();
const options = require('./options')

const executeRaw = (cmd) => {
	console.log('executing', cmd);
	return new Promise((resolve, reject) => { 
		
		exec(`./inverter_poller -r ${cmd}`, (err, stdout, stderr) => {
		  if (err) {
			console.error(err);
			reject(err);
		    // node couldn't execute the command
		    return;
		  }

		resolve(stdout);
		if (stderr) {
			console.log('error', stderr);
			reject(stderr);
		}
		});
	});
}

const status = null

const getStatus = (cached = true) => {
	return new Promise((resolve, reject) => { 
		if (cached && status) {
			resolve(status)
			return
		}

		exec('./inverter_poller -1', (err, stdout, stderr) => {
		  if (err) {
			console.error(err);
			reject(err);
		    // node couldn't execute the command
		    return;
		  }
		  const date = new Date();
		  const status = { time: date.toISOString(), ...JSON.parse(stdout) }

		resolve(status);
		if (stderr) reject(stderr);
		});
	});
}

const publishStatus = async () => {
	const status = await getStatus(false)
	console.log('latest status', status);
	emitter.emit("status", status);
}

setInterval(publishStatus, options.publishStatusSeconds * 1000);

module.exports = {
	executeRaw,
	getStatus,
	emitter
}
