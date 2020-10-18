const http = require('http');
const WebSocket = require('ws');
const { execute, executeRaw, getStatus, emitter } = require('./commands')
const { sensors } = require('./sensors')
const { publish } = require('./mqtt')

const wsTypes = { STATUS: "status", SENSOR: "sensor", COMMAND: "command", MQTT: "mqtt" }

const connections = []

emitter.on("sensor", (sensor) => {
    for (var connection of connections) {
	    try {
		connection.send(JSON.stringify({ type: wsTypes.SENSOR, data: sensor }));
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
    sendAllSensors(ws)

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
	    console.log('incoming', msg)

        switch (msg.type) {
            case wsTypes.STATUS: {
                await sendStatus(ws)
                break;
            }
            case wsTypes.MQTT: {
            await publish(msg.data.topic, msg.data.msg)
            break;
            }
            case wsTypes.COMMAND: {
            await execute(msg.data.command, msg.data.value)
            }
        }

        console.log('received: %s', message);
    });
});

const sendAllSensors = (ws) => {
	sensors.forEach(s => {
		ws.send(JSON.stringify({ type: wsTypes.SENSOR, data: s }));
	})
}

const sendStatus = async (ws, status) => {
    if (status) {
        ws.send(JSON.stringify({ type: wsTypes.STATUS, data: status }));
    } else {
        const status = await getStatus(true);
        ws.send(JSON.stringify({ type: wsTypes.STATUS, data: status }));
    }
}
