const options = require('./options')
const axpertCommands = require('./axpert-commands')

if (!options.inverter || options.inverter === "AXPERT") {
  module.exports = axpertCommands
}

if (!options.inverter || options.inverter === "MUST") {
  module.exports = mustCommands
}

module.exports = {
	execute,
	executeRaw,
	getStatus,
	emitter
}
