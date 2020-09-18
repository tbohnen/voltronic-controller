const http = require('http');
const WebSocket = require('ws');
const { executeRaw, getStatus } = require('./commands')

const { EventEmitter } = require("events");
const emitter = new EventEmitter();

const connections = []

emitter.on("status", (status) => {
    for (var connection of connections) {
        sendStatus(connection, status)
    }
})

const wss = new WebSocket.Server({ port: 8999 });

const wsTypes = {
    STATUS: "status"
}


wss.on('connection', async (ws) => {
    connections.push(ws)
    await sendStatus(ws)

    ws.on('message', async (message) => {
        const msg = JSON.parse(message)

        switch (msg.type) {
            case wsTypes.STATUS: {
                await sendStatus(ws)
                break;
            }
        }

        //log the received message and send it back to the client
        console.log('received: %s', message);
    });
});

const sendStatus = async (ws, status) => {
    if (status) {
        console.log('sending', status)
        ws.send(JSON.stringify({ type: wsTypes.STATUS, data: status }));
    } else {
        const status = await getStatus();
        console.log('sending', status)
        ws.send(JSON.stringify({ type: wsTypes.STATUS, data: status }));
    }
}
