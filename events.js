const { emitter } = require('./commands')

const logEvent = (name, message) => {
const event = { name, message, time: Date.now() }
  emitter.emit('event', event)
}

const logError = (error, message) => {
  if (message) {
    console.error(message, error)
  } else {
    console.error(error)
  }
}

module.exports = { logEvent, logError }
