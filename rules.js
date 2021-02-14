const { emitter, execute  } = require('./commands')
const { ruleConfig, disableRules } = require('./options')
const pagerduty = require('./pagerduty')
const { logEvent, logError } = require('./events')
const { publish } = require('./mqtt')
const { getSensor } = require('./sensors')

const statuses = []

let getAverage = (array) => array.reduce((a, b) => a + b) / array.length;
const lastN = (array, n = 5) => array.slice(Math.max(array.length - 5, 0))

//{"time":"2020-10-22T15:46:58.504Z","Inverter_mode":4,"AC_grid_voltage":225.1,"AC_grid_frequency":49.9,"AC_out_voltage":229.8,"AC_out_frequency":49.9,"PV_in_voltage":60,"PV_in_current":2,"PV_in_watts":100.3,"PV_in_watthour":3.3444,"SCC_voltage":49.67,"Load_pct":5,"Load_watt":251,"Load_watthour":8.3667,"Load_va":275,"Bus_voltage":339,"Heatsink_temperature":46,"Battery_capacity":97,"Battery_voltage":49.7,"Battery_charge_current":0,"Battery_discharge_current":3,"Load_status_on":1,"SCC_charge_on":1,"AC_charge_on":0,"Battery_recharge_voltage":48,"Battery_under_voltage":47,"Battery_bulk_voltage":53.2,"Battery_float_voltage":53.2,"Max_grid_charge_current":2,"Max_charge_current":10,"Out_source_priority":2,"Charger_source_priority":2,"Battery_redischarge_voltage":0,"Warnings":"000000000000000000000000000000000000","_id":"0019NsZInEF7cZbl","createdAt":{"$$date":1603381618507},"updatedAt":{"$$date":1603381618507}}

const getLastNAverage = (name, n = 3) => {
    let average = 0

      if (statuses.length > n) {
        const last5Discharge = lastN(statuses.map(s => Number(s[name])), n)
        average = getAverage(last5Discharge)
      } 

    return average
}


const switchGeyserOff = async (latestStatus) => {
  try {

    const average = getLastNAverage('Battery_discharge_current')
    const geyserSensor = getSensor('geyser')
    if (!geyserSensor) return

      //We set it to on 
      const geyserOn = geyserSensor.latestMessages['geyser/stat/POWER'] ? geyserSensor.latestMessages['geyser/stat/POWER'].toUpperCase() === "ON" : false
      const lastGeyserWarmTime = Math.round((Date.now() - (geyserSensor.noCurrentDrawTime || 0)) )
      const geyserWarmToday = lastGeyserWarmTime < 12*60*60*1000 && lastGeyserWarmTime > 60*1000

    const averageWatts = getLastNAverage('PV_in_watts', 20)


//TODO: if geyser is on and react / apparent power is zero, it means geyser has warmed up for the day. Need to decide what to do then...

    console.log(`Switch off Geyser rule ${average} >= ${ruleConfig.highDischarge}, ${geyserOn}, power = ${geyserSensor.power}, current: ${geyserSensor.current}, warm today: ${geyserWarmToday}, average watts: ${averageWatts}`)
      if (((average >= ruleConfig.highDischarge || Number(latestStatus.Battery_discharge_current) > 50) && geyserOn) || (geyserOn && Number(latestStatus.Battery_capacity) <= ruleConfig.switchGeyserOffOnPerc) || (geyserOn && geyserWarmToday) && averageWatts > 2000) {
        logEvent('switch geyser off high discharge', `High battery discharge or low battery, average ${average}, latest: ${latestStatus.Battery_discharge_current}, capacity: ${Number(latestStatus.Battery_capacity)}, lastWarmTime: ${lastGeyserWarmTime / 1000 / 60} switching geyser off`)
        await publish('geyser/cmnd/Power', 'OFF')
      }
  } catch (e) {
    logError(e, "Could not switch geyser off on high discharge")
  }
}


const switchPoolOff = async (latestStatus) => {
  try {

    const averageDischarge = getLastNAverage('Battery_discharge_current', 5)
    const poolSensor = getSensor('pool')
    if (!poolSensor) return

      const poolOn = poolSensor.latestMessages['pool/stat/POWER'] ? poolSensor.latestMessages['pool/stat/POWER'].toUpperCase() === "ON" : false

      if (poolOn && averageDischarge > 10) {
        logEvent('switch pool off', `Average discharge ${average}`)
        await publish('pool/cmnd/Power', 'OFF')
      }
  } catch (e) {
    logError(e, "Could not switch pool off on high discharge")
  }
}

const switchToSolarOnHighPv = async (latestStatus) => {
  try {
  const averagePvInWatts = getLastNAverage('PV_in_watts', 5)
  const averageLoadWatts = getLastNAverage('Load_watt', 5)

    if (
        Number(latestStatus.Battery_capacity) > (ruleConfig.lowBattery * 1.2) && 
        Number(latestStatus.Inverter_mode) === 3 && 
        Number(latestStatus.Battery_discharge_current) == 0 && 
        averagePvInWatts > (averageLoadWatts * 1.1)
) {
      await execute('source', 'solar')
      logEvent('Switched to solar', `Average Pv In Watts: ${averagePvInWatts}, Average Load Watts: ${averageLoadWatts}, current mode: ${latestStatus.Inverter_mode}`)
    }
  } catch (e) {
    logError(e, "Could not switch to solar")
  }
}


const switchGeyserOn = async (latestStatus) => {
  try {
    if (statuses.length < 5) {
      console.log('not running geyser on, not enough stasuses')
        return
    }
    const average = getLastNAverage('Battery_discharge_current')
      const geyserSensor = getSensor('geyser')
      if (!geyserSensor) return

        const geyserOn = geyserSensor.power

      const lastGeyserWarmTime = Math.round((Date.now() - (geyserSensor.noCurrentDrawTime || 0)))
      const geyserWarmToday = lastGeyserWarmTime < 12*60*60*1000 && lastGeyserWarmTime > 60*1000


          if (!geyserWarmToday && Number(latestStatus.Battery_capacity) >= ruleConfig.switchGeyserOnAfterPerc && average === 0 && !geyserOn) {
            await publish('geyser/cmnd/Power', 'ON')
              logEvent('switch geyser on', `geyser switch on: ${geyserOn}, average discharge: ${average} capacity: ${Number(latestStatus.Battery_capacity)} switch on at: ${ruleConfig.switchGeyserOnAfterPerc}, last warm time ago: ${lastGeyserWarmTime}`)
          }
  } catch (e) {
    logError(e, "Could run switch geyser on")
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
    if (Number(latestStatus.Battery_capacity) < (ruleConfig.lowBattery) && Number(latestStatus.Inverter_mode) === 4) {
      logEvent('low battery', `Battery status: ${latestStatus.Battery_capacity}`)
    }
  } catch (e) {
    logError("Could not log low battery", e)
  }
}

let running = false
let enabled = ruleConfig.enabled

const runRules = async (latestStatus) => {
  if (running) {
    console.log('already running rules, not running again')
    return
  }

  if (!enabled) return

  try {
    running = true
    console.log('running rules')
    await logLowBatteryWarning(latestStatus)
    await switchToUtilityOnLowBattery(latestStatus)
    await switchGeyserOff(latestStatus)
    await switchToSolarOnHighPv(latestStatus)
    await switchGeyserOn(latestStatus)
    //await switchPoolOff(latestStatus)
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


const toggleAllEnabled = (allEnabled) => {
  enabled = allEnabled
}

const status = () => {
  return { enabled }
}


module.exports = {
  toggleAllEnabled,
  status
}
