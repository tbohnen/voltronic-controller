const { exec } = require('child_process');
const { EventEmitter } = require("events");
const emitter = new EventEmitter();
const options = require('./options')

let status = null

const execute = () => {
  console.error("Execute not supported on must")
}

const executeRaw = () => {
  console.error("Execute raw not supported on must")

}

const mapMustToAxpert = (must) => {

	let capacity = 0

	if (Number(must._inverterBatteryVoltage) >= 28.8) {
		capacity = 100
	}
	else if (Number(must._inverterBatteryVoltage) >= 26.8) {
		capacity = 99
	}
	else if (Number(must._inverterBatteryVoltage) >= 26.6) {
		capacity = 90
	}
	else if (Number(must._inverterBatteryVoltage) >= 26.4) {
		capacity = 70
	}
	else if (Number(must._inverterBatteryVoltage) >= 26.2) {
		capacity = 40
	}
	else if (Number(must._inverterBatteryVoltage) >= 25.8) {
		capacity = 20
	}
	else if (Number(must._inverterBatteryVoltage) >= 25.6) {
		capacity = 17
	}
	else if (Number(must._inverterBatteryVoltage) >= 25) {
		capacity = 14
	}
	else if (Number(must._inverterBatteryVoltage) >= 24) {
		capacity = 9
	}



	return  {
	Inverter_mode: 0,
	AC_grid_voltage: 0,
	AC_grid_frequency: 0,
	AC_out_voltage: 0,
	AC_out_frequency: 0,
	PV_in_voltage: must._pvVoltage,
	PV_in_current: must._controlCurrnet,
	PV_in_watts: must._pInverter,
	PV_in_watthour: 0,
	SCC_voltage: 0,
	Load_pct: must._loadPercent,
	Load_watt: must._sload,
	Load_watthour: 0,
	Load_va: 0,
	Bus_voltage: must._busVoltage,
	Heatsink_temperature: must._acRadiatorTemperature,
	Battery_capacity: capacity,
	Battery_voltage: must._inverterBatteryVoltage,
	Battery_charge_current: must._chargerCurrent,
	Battery_discharge_current: 0,
	Load_status_on: 0,
	SCC_charge_on: 0,
	AC_charge_on: 0,
	Battery_recharge_voltage: 0,
	Battery_under_voltage: 0,
	Battery_bulk_voltage: 0,
	Battery_float_voltage: 0,
	Max_grid_charge_current: 0,
	Max_charge_current: 0,
	Out_source_priority: 0,
	Charger_source_priority: 0,
	Battery_redischarge_voltage: 0,
	Warnings: ""
	}

}

const getStatus = (cached = true) => {
	return new Promise((resolve, reject) => { 
		if (cached && status) {
			resolve(status)
			return
		}

		exec('mono ./must-poller/MonoInverter.exe', (err, stdout, stderr) => {
		  if (err) {
			console.error(err);
			reject(err);
		    // node couldn't execute the command
		    return;
		  }
		  const date = new Date();
		  const mapped = mapMustToAxpert(JSON.parse(stdout))
		  status = { type: "must", time: date.toISOString(), ...mapped }

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

getStatus()

const publishStatus = async () => {
	const status = await getStatus(false)
	emitter.emit("status", status);
}

setInterval(publishStatus, options.publishStatusSeconds * 1000);
