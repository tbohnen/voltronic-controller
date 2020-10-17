const { emitter, execute  } = require('./commands')
const { ruleConfig } = require('./options')
const pagerduty = require('./pagerduty')
const { logEvent, logError } = require('./events')

const statuses = []

const switchToUtilityOnLowBattery = (latestStatus) => {
  try {
    if (Number(latestStatus.Battery_capacity) <= (ruleConfig.lowBattery) && Number(latestStatus.Inverter_mode) === 4) {
      //await execute('source', 'utility')
      logEvent('Switched to utility on low battery')
    }
  } catch (e) {
    logError(e, "Could not log low battery")
  }
}

const logLowBatteryWarning = async (latestStatus) => {
  try {
    if (Number(latestStatus.Battery_capacity) <= (ruleConfig.lowBattery + 2) && Number(latestStatus.Inverter_mode) === 4) {
      await pagerduty('low battery')
    }
  } catch (e) {
    logError("Could not log low battery")
  }
}

let running = false

const runRules = async (latestStatus) => {
  if (running) {
    console.log('already running rules, not running again')
    return
  }

  try {
    running = true
    console.log('running rules')
    await logLowBatteryWarning(latestStatus)
    await switchToUtilityOnLowBattery(latestStatus)
    console.log('done running rules')
  }
  catch (e) {
    logError('error running rules')
  }
  finally {
    running = false
  }
}

emitter.on('status', (status) => {
    statuses.push(status)
    runRules(status)
  })


