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


const getStatus = () => {
	return new Promise((resolve, reject) => { 
		exec('./inverter_poller -1', (err, stdout, stderr) => {
		  if (err) {
			console.error(err);
			reject(err);
		    // node couldn't execute the command
		    return;
		  }

		resolve(JSON.parse(stdout));
		if (stderr) reject(stderr);
		});
	});
}

module.exports = {
	executeRaw,
	getStatus
}
