import React, { useState, useEffect } from 'react'
import config from '../../config'

const wsTypes = {
    STATUS: "status",
    SENSOR: "sensor",
    COMMAND: "command",
    MQTT: "mqtt"
}

const connectWs = (state, setState, sensors, setSensors) => {
    console.log('connect ws')
    const socket = new WebSocket(config.wsUrl);

    socket.addEventListener('close', function () {
        console.log('ws close')
        setState({ connected: false })
    });

    socket.addEventListener('open', function (event) {
        console.log('ws open')
        setState({ ...state, socket })
        socket.send(JSON.stringify({ type: wsTypes.STATUS }));
    });

    socket.addEventListener('message', function (event) {
        const parsed = JSON.parse(event.data)
        console.log('Message from server ', parsed);

        switch (parsed.type) {
            case wsTypes.STATUS: {
                console.log('setting status', parsed.data)
                console.log('state', state)
                setState({ socket, status: parsed.data })
                break;
            }
            case wsTypes.SENSOR: {
                console.log('sensor data', parsed)
                const index = sensors.findIndex(s => s.topic === parsed.data.topic)
                if (index > -1) {
                    sensors[index] = parsed.data
                    setSensors([...sensors])
                } else {
                    setSensors([...sensors, parsed.data])
                }
                break;
            }
        }
    });
}


const Dashboard = (props) => {
    const [state, setState] = useState({ socket: null, status: {} })
    const [sensors, setSensors] = useState([ ])
    console.log(state)

    useEffect(() => {
        if (!state.socket) {
            console.log('connecting ws')
            connectWs(state, setState, sensors, setSensors)
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


const renderSensors = (sensors, socket) => {
    return (<div style={{display: "grid", gridTemplateColumns: "auto auto auto" }}>
        <h3>Sensors</h3>
        {sensors.map(s => <>
            <div>Name: {s.name}</div>
            <div>Power: {s.latestMessages[`${s.topic}/stat/POWER`]}</div>
            <div><button onClick={() => { sendMqtt(`${s.topic}/cmnd/Power`, 'TOGGLE', socket) } }>Toggle</button></div>
            </>)}
    </div>)
}

const renderSendCommand = (socket) => {

    return (<div>
<button onClick={() => { sendCommand('solar', 'source',socket) }}>Solar</button>
<button onClick={() => { sendCommand('utility', 'source', socket) }}>Utility</button>
    </div>)
}

const renderVoltronic = (status) => {
    return (<div style={{ display: "grid", gridTemplateColumns: "auto auto auto auto" }}>
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
            <div>Inverter mode (3=grid,4=solar,0) {status.Inverter_mode} </div>
            <div>Grid Voltage {status.AC_grid_voltage} </div>
        </div>
    </div>)
}

    return (
<div>
<div>
        <h3>Status: {state && state.socket ? state.socket.readyState : "N/A"} ({state.status && new Date(state.status.time).toLocaleString()})</h3>
        <div>{ renderSendCommand(state.socket) }</div>
</div>
        <div style={{ display: "grid", gridTemplateColumns: "70% 30%" }}>
          { state.status && renderVoltronic(state.status) }
          { sensors && renderSensors(sensors, state.socket) }
        </div></div>)
}

export default Dashboard
