
const logEvent = (event) => {
  console.log('event', event)
}

const logError = (error, message) => {
  if (message) {
    console.error(message, error)
  } else {
    console.error(error)
  }
}

module.exports = { logEvent, logError }
