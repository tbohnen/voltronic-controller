const http = require('http');
const WebSocket = require('ws');
const { executeRaw, getStatus, emitter } = require('./commands')

const wsTypes = { STATUS: "status", SENSOR: "sensor" }

const connections = []

emitter.on("sensor", (sensor) => {
    for (var connection of connections) {
	    try {
        ws.send(JSON.stringify({ type: wsTypes.SENSOR, data: sensor }));
	    } catch (e) {
		    console.error(e)
	    }
    }
})

emitter.on("status", (status) => {
    for (var connection of connections) {
	    try {
		sendStatus(connection, status)
	    } catch (e) {
		    console.error(e)
	    }
    }
})

const wss = new WebSocket.Server({ port: 8999 });


wss.on('close', (ws) => {
    console.log('socket disconnected')
    const index = connections.findIndex(c => c === ws);
    if (index > -1) {
	    connections.splice(index, 1);
	    console.log(`removed connection, remaining ${connections.length}`)
    }
})

wss.on('connection', async (ws) => {
    connections.push(ws)

    console.log(`ws connected, open: ${connections.length}`)
    await sendStatus(ws)

    ws.on('close', () => {
	    console.log('socket disconnected')
	    const index = connections.findIndex(c => c === ws);
	    if (index > -1) {
		    connections.splice(index, 1);
		    console.log(`removed connection, remaining ${connections.length}`)
	    }
    })

    ws.on('message', async (message) => {
        const msg = JSON.parse(message)

        switch (msg.type) {
            case wsTypes.STATUS: {
                await sendStatus(ws)
                break;
            }
        }

        console.log('received: %s', message);
    });
});

const sendStatus = async (ws, status) => {
    if (status) {
        console.log('sending from emitter', status)
        ws.send(JSON.stringify({ type: wsTypes.STATUS, data: status }));
    } else {
        const status = await getStatus(true);
        console.log('sending on request', status)
        ws.send(JSON.stringify({ type: wsTypes.STATUS, data: status }));
    }
}
