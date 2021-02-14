import React, { useState, useEffect, useRef } from 'react'
import config from '../../config'
import axios from 'axios'

const wsTypes = {
    STATUS: "status",
    SENSOR: "sensor",
    COMMAND: "command",
    MQTT: "mqtt",
    EVENT: "event"
}

//TODO: This is a hack ...
const localSensors = { }
const localEvents = []


const toggleRulesEnabled = async (rulesEnabled, setRulesEnabled) => {
  const res = await axios.post(`${config.httpUrl}/rules`, { enabled : !rulesEnabled })
  setRulesEnabled(!rulesEnabled)
}

const Dashboard = (props) => {
    const [state, setState] = useState({ socket: null, status: {} })
    const [sensors, setSensors] = useState({ })
    const [events, setEvents] = useState([])
    const socket = useRef(null);
    const updateSensorInState = (sensor) => { 
      localSensors[sensor.data.topic] = sensor.data
      setSensors({ ...localSensors }) 
    }

    const [rulesEnabled, setRulesEnabled] = useState(false)


useEffect(() => {
    async function fetch() {
    try {
    const res = await axios(`${config.httpUrl}/rules`)
    setRulesEnabled(res.data.enabled)
    }
    catch (e) {
    console.error(e)
    }
    }
    fetch()
    return () => {}
 }, [ rulesEnabled ])

    useEffect(() => {
        if (!socket.current) {

        console.log('connecting ws')
        socket.current = new WebSocket(config.wsUrl);
        console.log('connect ws')

        socket.current.addEventListener('close', function () {
            console.log('ws close')
            setState({ connected: false })
            });

        socket.current.addEventListener('open', function (event) {
            console.log('ws open')
            setState({ ...state, socket })
            socket.current.send(JSON.stringify({ type: wsTypes.STATUS }));
            });

        socket.current.addEventListener('message', (event) => {
            const parsed = JSON.parse(event.data)

            switch (parsed.type) {
            case wsTypes.EVENT: {
            console.log('time', parsed)
            const mapped = { ...parsed.data, time: new Date(parsed.data.time) }
            localEvents.push(mapped)
            setEvents([...localEvents])
            break;
            }
            case wsTypes.STATUS: {
            console.log('status', parsed)
            setState({ status: parsed.data })
            break;
            }
            case wsTypes.SENSOR: {
            console.log('sensor', parsed)
            updateSensorInState(parsed)

              break;
                                 }
            }
        });
        }
    })


//     time: 2020-09-18T03:42:28.172Z
// Inverter_mode: 0 // AC_grid_voltage: 230 // AC_grid_frequency: 49.9 // AC_out_voltage: 230 // AC_out_frequency: 49.9 // PV_in_voltage: 0
// PV_in_current: 0 // PV_in_watts: 0 // PV_in_watthour: 0 // SCC_voltage: 0 // Load_pct: 5 // Load_watt: 269 // Load_watthour: 8.9667
// Load_va: 276 // Bus_voltage: 361 // Heatsink_temperature: 30 // Battery_capacity: 50 // Battery_voltage: 49.8 // Battery_charge_current: 2
// Battery_discharge_current: 0 // Load_status_on: 1 // SCC_charge_on: 0 // AC_charge_on: 1 // Battery_recharge_voltage: 47
// Battery_under_voltage: 47 // Battery_bulk_voltage: 53.2 // Battery_float_voltage: 53.2 // Max_grid_charge_current: 2 // Max_charge_current: 30
// Out_source_priority: 2 // Charger_source_priority: 2 // Battery_redischarge_voltage: 0 // Warnings: 100000000000001000000000000000010000

const sendCommand = (value, command, socket) => {
  socket.send(JSON.stringify({ type: wsTypes.COMMAND, data: { command, value } }));
}

const sendMqtt = (topic, msg, socket) => {
  socket.send(JSON.stringify({ type: wsTypes.MQTT, data: { topic, msg } }));
}

const renderEvents = (events) => {
    return (<div style={{display: "grid", justifyItems: "start", gridTemplateColumns: "auto auto auto" }}>
<div></div><div><h3>Events</h3></div><div></div>
        {events.sort((a,b) => b.time && a.time && b.time.getTime() - a.time.getTime() ).map(e => <>
            <div>Name: {e.name}</div>
            <div>Time: {e.time && e.time.toLocaleString()}</div>
            <div>Messsage: {e.message ? e.message.toString() : 'N/A'}</div>
            </>)}
    </div>)
}

const renderSensors = (sensors, socket) => {
    return (<div style={{display: "grid", justifyItems: "start", gridTemplateColumns: "auto auto auto auto auto auto" }}>
<div style={{gridColumn: "1/-1"}}><h3>Sensors</h3></div>
        {Object.values(sensors).map(s => <>
            <div>Name: {s.name}</div>
            <div>Power: {s.latestMessages[`${s.topic}/stat/POWER`]}</div>
            <div>Current: {s.current}</div>
            <div>Today: {s.todayWatts}</div>
            <div><button onClick={() => { sendMqtt(`${s.topic}/cmnd/Power`, 'TOGGLE', socket) } }>Toggle</button></div>
            <div><button onClick={() => { sendMqtt(`${s.topic}/cmnd/Power`, '', socket) } }>Query</button></div>
            </>)}
    </div>)
}

const renderSendCommand = (socket) => {

    return (<div>
<button style={{padding: "1px" }} onClick={() => { sendCommand('solar', 'source',socket) }}>Solar</button>
<button style={{padding: "1px" }} onClick={() => { sendCommand('utility', 'source', socket) }}>Utility</button>
    </div>)
}

const renderCurrentMode = (mode) => {
  if (mode == 3) return "Utility" 
  else if (mode == 4) return "Solar" 
  else return mode
}

const renderRulesEnabled = (rulesEnabled, setRulesEnabled) => {
  return (<div>Rules Enabled: <button onClick={() => toggleRulesEnabled(rulesEnabled, setRulesEnabled)}>{ rulesEnabled ? "Yes": "No" }</button></div>)
}

const renderVoltronic = (status) => {
    return (<div style={{ display: "grid", gridTemplateColumns: "auto" }}>
        <div>
            <h3>Battery</h3>
            <div>Battery Charge current: {status.Battery_charge_current}A</div>
            <div>Battery Discharge current: {status.Battery_discharge_current}A</div>
            <div>Battery Capacity: {status.Battery_capacity}%</div>
            <div>Battery Voltage: {status.Battery_voltage}V</div>
        </div>
        <div>
            <h3>PV</h3>
            <div>PV in Watts: {status.PV_in_watts}W</div>
        </div>
        <div>
            <h3>Load</h3>
            <div>Load watts: {status.Load_watt}W</div>
            <div>Load whs: {status.Load_watthour}W/H</div>
            <div>Load: {status.Load_pct}%</div>
        </div>
        <div>
            <h3>Misc</h3>
            <div>Inverter mode (3=grid,4=solar,0) { renderCurrentMode(status.Inverter_mode) } </div>
            <div>Grid Voltage {status.AC_grid_voltage} </div>
        </div>
    </div>)
}

    return (
<div>
<div>
        <h3>Status: {state && state.socket ? state.socket.readyState : "N/A"} ({state.status && new Date(state.status.time).toLocaleString()})</h3>
        <div>{ renderSendCommand(socket.current) }</div>
          { renderRulesEnabled(rulesEnabled, setRulesEnabled) }
</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto auto auto" }}>
          { state.status && renderVoltronic(state.status) }
          { sensors && renderSensors(sensors, socket.current) }
          { events && renderEvents(events) }
        </div></div>)
}

export default Dashboard
