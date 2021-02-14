const emitter = new EventEmitter();

const execute = () => {
  console.error("Execute not supported on must")
}

const executeRaw = () => {
  console.error("Execute raw not supported on must")
}

const getStatus = (cached = true) => {
	return new Promise((resolve, reject) => { 
		if (cached && status) {
			resolve(status)
			return
		}

		exec('mono ./must_poller/MonoInverter.exe', (err, stdout, stderr) => {
		  if (err) {
			console.error(err);
			reject(err);
		    // node couldn't execute the command
		    return;
		  }
		  const date = new Date();
		  status = { type: "must", time: date.toISOString(), ...JSON.parse(stdout) }

	          resolve(status);
                  if (stderr) reject(stderr);
		});
	});
}

module.exports = {
	execute,
	executeRaw,
	getStatus,
	emitter
}
