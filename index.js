const express = require('express')
const app = express()
const { executeRaw, getStatus } = require('./commands')
const mqtt = require('./mqtt')

app.use(express.json());
 
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

app.listen(3000)


getStatus().then(s => console.log('status', s));

const sleepMs = (ms) => {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(), ms);
	});
}

mqtt.init()
