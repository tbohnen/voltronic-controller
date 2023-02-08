const Influx = require('influx')
const { emitter } = require('./commands')
const {influxConfig} = require('./options')

const influx = new Influx.InfluxDB({
	token: influxConfig.token,
	host: influxConfig.server,
	database: influxConfig.db,
	schema: [
		{
			measurement: 'status',
			fields: {
				time: Influx.FieldType.INTEGER,
				type: Influx.FieldType.STRING,
				Inverter_mode: Influx.FieldType.INTEGER,
				AC_grid_voltage: Influx.FieldType.FLOAT,
				AC_grid_frequency: Influx.FieldType.FLOAT,
				AC_out_voltage: Influx.FieldType.FLOAT,
				AC_out_frequency: Influx.FieldType.FLOAT,
				PV_in_voltage: Influx.FieldType.FLOAT,
				PV_in_current: Influx.FieldType.FLOAT,
				PV_in_watts: Influx.FieldType.FLOAT,
				PV_in_watthour: Influx.FieldType.FLOAT,
				SCC_voltage: Influx.FieldType.FLOAT,
				Load_pct: Influx.FieldType.FLOAT,
				Load_watt: Influx.FieldType.FLOAT,
				Load_watthour: Influx.FieldType.FLOAT,
				Load_va: Influx.FieldType.FLOAT,
				Bus_voltage: Influx.FieldType.FLOAT,
				Heatsink_temperature: Influx.FieldType.FLOAT,
				Battery_capacity: Influx.FieldType.FLOAT,
				Battery_voltage: Influx.FieldType.FLOAT,
				Battery_charge_current: Influx.FieldType.FLOAT,
				Battery_discharge_current: Influx.FieldType.FLOAT,
				Load_status_on: Influx.FieldType.INTEGER,
				SCC_charge_on: Influx.FieldType.INTEGER,
				AC_charge_on: Influx.FieldType.INTEGER,
				Battery_recharge_voltage: Influx.FieldType.FLOAT,
				Battery_under_voltage: Influx.FieldType.FLOAT,
				Battery_bulk_voltage: Influx.FieldType.FLOAT,
				Battery_float_voltage: Influx.FieldType.FLOAT,
				Max_grid_charge_current: Influx.FieldType.INTEGER,
				Max_charge_current: Influx.FieldType.INTEGER,
				Out_source_priority: Influx.FieldType.INTEGER,
				Charger_source_priority: Influx.FieldType.INTEGER,
				Battery_redischarge_voltage: Influx.FieldType.INTEGER,
				Warnings: Influx.FieldType.STRING
			},
			tags: []
		}, {
			measurement: 'event',
			fields: {
				time: Influx.FieldType.INTEGER,
				name: Influx.FieldType.STRING,
				message: Influx.FieldType.STRING
			}, tags: [],
		},
		{
			measurement: 'sensor',
			fields: {
				time: Influx.FieldType.INTEGER,
				name: Influx.FieldType.STRING,
				power: Influx.FieldType.STRING,
				current: Influx.FieldType.FLOAT,
				todayWatts: Influx.FieldType.FLOAT,
				temp: Influx.FieldType.FLOAT
			}, tags: [],
		},
		{
			measurement: 'weather',
			fields: {
				time: Influx.FieldType.INTEGER,
				cloudPercentage: Influx.FieldType.FLOAT,
				weather: Influx.FieldType.STRING,
				temp: Influx.FieldType.FLOAT
			}, tags: [],
		}
	]
})

const save = (measurement, data) => {
  console.log('saving')
  console.log(measurement, data);
  return
  try {
    console.log('writing influx', measurement)
      influx.writePoints([ { measurement, fields: data, }] )
      console.log('done writing influx', measurement)
  }
  catch (e) {
    console.error(e.message);

  }

}

emitter.on("weather", (weather) => {
	save('weather', weather)
})

emitter.on("sensor", (sensor) => {
	const mapped = {
		name: sensor.name,
		power: sensor.latestMessages[`${sensor.topic}/stat/POWER`],
		current: sensor.current,
		todayWatts: sensor.todayWatts,
		time: Date.now(),
		temp: sensor.temp,
	}

	save('sensor', mapped)
})

emitter.on("event", (event) => {

	const mapped = {
		...event,
		time: (new Date(event.time)).getTime()
	}

	save('event', event)
})

emitter.on("status", (status) => {

	const mapped = {
		...status,
		time: (new Date(status.time)).getTime()
	}

	save('status', mapped)
})
