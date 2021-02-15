const options = require('./options')

if (!options.inverter || options.inverter === "AXPERT") {
const axpertCommands = require('./axpert-commands')
  module.exports = axpertCommands
}

if (options.inverter && options.inverter === "MUST") {
const mustCommands = require('./must-commands')
  module.exports = mustCommands
}

