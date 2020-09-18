const { exec } = require('child_process');

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
		  const status = { time: Date.now(), ...JSON.parse(stdout) }

		resolve(status);
		if (stderr) reject(stderr);
		});
	});
}

module.exports = {
	executeRaw,
	getStatus
}
