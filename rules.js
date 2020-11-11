const { emitter, execute  } = require('./commands')
const { ruleConfig } = require('./options')
const pagerduty = require('./pagerduty')
const { logEvent, logError } = require('./events')
const { publish } = require('./mqtt')

const statuses = []

//{"time":"2020-10-22T15:46:58.504Z","Inverter_mode":4,"AC_grid_voltage":225.1,"AC_grid_frequency":49.9,"AC_out_voltage":229.8,"AC_out_frequency":49.9,"PV_in_voltage":60,"PV_in_current":2,"PV_in_watts":100.3,"PV_in_watthour":3.3444,"SCC_voltage":49.67,"Load_pct":5,"Load_watt":251,"Load_watthour":8.3667,"Load_va":275,"Bus_voltage":339,"Heatsink_temperature":46,"Battery_capacity":97,"Battery_voltage":49.7,"Battery_charge_current":0,"Battery_discharge_current":3,"Load_status_on":1,"SCC_charge_on":1,"AC_charge_on":0,"Battery_recharge_voltage":48,"Battery_under_voltage":47,"Battery_bulk_voltage":53.2,"Battery_float_voltage":53.2,"Max_grid_charge_current":2,"Max_charge_current":10,"Out_source_priority":2,"Charger_source_priority":2,"Battery_redischarge_voltage":0,"Warnings":"000000000000000000000000000000000000","_id":"0019NsZInEF7cZbl","createdAt":{"$$date":1603381618507},"updatedAt":{"$$date":1603381618507}}

const switchGeyserOffOnHighDraw = async (latestStatus) => {
  try {
//TODO: Check geyser on?
console.log(`Switch off Geyser rule ${Number(latestStatus.Battery_discharge_current)} >= ${ruleConfig.highDischarge}`)
    if (Number(latestStatus.Battery_discharge_current) >= ruleConfig.highDischarge) {
      logEvent('switch geyser off high discharge', `High battery discharge ${latestStatus.Battery_discharge_current}, switching geyser off`)
      await publish('geyser/cmnd/Power', 'OFF')
    }
  } catch (e) {
    logError(e, "Could not switch geyser off on high discharge")
  }
}

const switchToSolarOnHighPv = async (latestStatus) => {
  try {
    if (Number(latestStatus.Battery_capacity) > (ruleConfig.lowBattery * 1.2) && Number(latestStatus.Inverter_mode) === 3 && Number(latestStatus.Battery_discharge_current) == 0 && Number(latestStatus.PV_in_watts) > (Number(latestStatus.Load_watt) * 1.1)) {
      logEvent('Switched to solar', latestStatus)
      await execute('source', 'solar')
    }
  } catch (e) {
    logError(e, "Could not switch to solar")
  }
}

const switchToUtilityOnLowBattery = async (latestStatus) => {
  try {
    if (Number(latestStatus.Battery_capacity) <= (ruleConfig.lowBattery) && Number(latestStatus.Inverter_mode) === 4) {
      await execute('source', 'utility')
      logEvent('Switched to utility on low battery')
    }
  } catch (e) {
    logError(e, "Could not log low battery")
  }
}

const logLowBatteryWarning = async (latestStatus) => {
  try {
    if (Number(latestStatus.Battery_capacity) <= (ruleConfig.lowBattery + 2) && Number(latestStatus.Inverter_mode) === 4) {
      logEvent('low battery', `Battery status: ${latestStatus.Battery_capacity}`)
      //await pagerduty('low battery')
    }
  } catch (e) {
    logError("Could not log low battery", e)
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
    await switchGeyserOffOnHighDraw(latestStatus)
    await switchToSolarOnHighPv(latestStatus)
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


