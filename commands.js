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

let status = null

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
		  status = { time: date.toISOString(), ...JSON.parse(stdout) }

	          resolve(status);
                  if (stderr) reject(stderr);
		});
	});
}

const publishStatus = async () => {
	const status = await getStatus(false)
	emitter.emit("status", status);
}



setInterval(publishStatus, options.publishStatusSeconds * 1000);

const toggleSource = async (source) => {
	let code = "";

	if (source === "solar"){
		code = "02";
	} else if (source === "utility") {
		code = "00";
	}

	console.log('switching source to', source)

  const outcome2 = await executeRaw(`POP${code}`);
  console.log('POP outcome', outcome2)
  await sleepMs(2000);
  const outcome1 = await executeRaw(`PCP${code}`);
  console.log('PCP outcome', outcome1)
}

const execute = async (command, value) => {
	console.log(`executing command: ${command}, value: ${value}`);
	switch (command) {
		case "source": {
			await toggleSource(value)
     break;
    }
    case "mqtt": {
      await publishMqttCommand(value)
    }
	}
}

const sleepMs = (ms) => {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(), ms);
	});
}

module.exports = {
	execute,
	executeRaw,
	getStatus,
	emitter
}
