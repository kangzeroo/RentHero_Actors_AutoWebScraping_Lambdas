const axios = require('axios')
const RDS_MS = require(`../../credentials/${process.env.NODE_ENV}/API_URLS`).RDS_MS

// insert address components and return an address ID.
module.exports.insertAddressComponents = function(address_components, formatted_address, gps, place_id) {
  const headers = {
    headers: {
      Authorization: `Bearer xxxx`
    }
  }
  const p = new Promise((res, rej) => {
    axios.post(`${RDS_MS}/insert_address_components`, { address_components, formatted_address, gps, place_id, }, headers)
      .then((data) => {
        console.log(`------ Successful POST/insert_address_components ------`)
        console.log(data.data)
        res({
          address_id: data.data.address_id
        })
      })
      .catch((err) => {
        console.log('------> Failed POST/insert_address_components')
        console.log(err)
        rej(err)
      })
  })
  return p
}

module.exports.getAddressesWithinRadius = function(lat, lng, radius) {
  const p = new Promise((res, rej) => {
    axios.get(`${RDS_MS}/get_address_within_radius`, { lat: lat, lng: lng, radius: radius })
      .then((data) => {
        res(data.data)
      })
      .catch((err) => {
        console.log(err)
        rej(err)
      })
  })
  return p
}
