import React, { useState, useEffect } from 'react'
import config from '../../config'

const wsTypes = {
    STATUS: "status"
}


const Dashboard = (props) => {
    const [state, setState] = useState({ connected: false, status: { } })
    console.log(state)

    const connectWs = () => {
        console.log('connect ws')
        const socket = new WebSocket(config.wsUrl);

        socket.addEventListener('open', function (event) {
            console.log('ws open')
            setState({ ...state, connected: true })
            socket.send(JSON.stringify({ type: wsTypes.STATUS }));
        });

        socket.addEventListener('message', function (event) {
            const parsed = JSON.parse(event.data)
            console.log('Message from server ', parsed);

            switch (parsed.type) {
                case wsTypes.STATUS: {
                    console.log('setting status', parsed.data)
                    console.log('state', state)
                    setState({ connected: true, status: parsed.data })
                }
            }
        });
    }

    useEffect(() => {
        if (!state.connected) {
            console.log('connecting ws')
            connectWs(state, setState)
        }
    })

return (<div>
        <h3>Status: {state.connected.toString()}</h3>
    {
    Object.keys(state.status).map(k => {
        return (<div>{k}: {state.status[k]}</div>)
    })
    }</div>)
}

export default Dashboard