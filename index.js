const express = require('express')
const app = express()
const { executeRaw, getStatus } = require('./commands')
const mqtt = require('./mqtt')
const ws = require('./ws')
const rules = require('./rules')
const db = require('./db')
const influxService = require('./influx')
const weather = require('./weather')
const cors = require('cors')
const options = require('./options')

app.use(cors())

app.use(express.json());

app.get('/history', async function(req, res) {
const result = await db.getSolar( {}, req.query.skip || 0, req.query.limit || 100 )
  res.json(result).end()
})


app.get('/rules', async function(req, res) {
  res.json(rules.status())
})

app.post('/rules', async function(req, res) {
  const { enabled } = req.body
  rules.toggleAllEnabled(enabled)
  res.status(201).end()
})
 
app.get('/', async function (req, res) {
  const status = await getStatus();
  res.json(status);
})


app.post('/source', async function(req, res) {
	let code = "";

	if (req.body.source === "solar"){
		code = "02";
	} else if (req.body.source === "utility") {
		code = "00";
	}
	else {
		res.status(400).end();
		return
	}


  const outcome2 = await executeRaw(`POP${code}`);
  await sleepMs(2000);
  const outcome1 = await executeRaw(`PCP${code}`);

  console.log('outcome 1', outcome1);
  console.log('outcome 2', outcome2);

  res.send("").end()
});

app.listen(options.httpConfig.port)

//getStatus().then(s => console.log('status', s));

const sleepMs = (ms) => {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(), ms);
	});
}

mqtt.init()
