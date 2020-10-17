const options = require('./options')
const bent = require('bent')

const post = bent('https://api.pagerduty.com', 'POST', 'json', 200);
const get = bent('https://api.pagerduty.com', 'GET', 'json', 200);

const alreadyTriggered = async (title) => {
  const response = await post('/incidents?statuses%5B%5D=triggered%2Cacknowledged', { 
      "Authorization": `Token token=${options.pagerDuty.apiKey}`,
      "From": options.pagerDuty.email,
      });

  console.log('response', response)

  return false
}


const submitIncident = async (title) => {
  try {
    if (alreadyTriggered) return


    const response = await post('/incidents', { incident: { title, service: { id: options.pagerDuty.serviceId, type: "service_reference" } } }, { 
        "Authorization": `Token token=${options.pagerDuty.apiKey}`,
        "From": options.pagerDuty.email,
        });

    console.log(response)
  } catch (e) {
    const error = await e.text()
    console.error(error)
  }
}


submitIncident('startup')
