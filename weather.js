const axios = require('axios')
const { weatherApiKey } = require('./options')
const { emitter } = require('./commands')

if (!weatherApiKey) return

const get = async () => {
const url =  `https://api.openweathermap.org/data/2.5/weather?q=johannesburg&appid=${weatherApiKey}&units=metric`
  const response = await axios.get(url)

  const mapped = {
    time: Date.now(),
    temp: response.data.main.temp,
    cloudPercentage: response.data.clouds.all,
    weather: response.data.weather[0].main,
  }

  emitter.emit('weather', mapped)
}

setInterval(() => {
  get()
 }, 30000)

get()
