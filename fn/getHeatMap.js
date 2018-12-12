const moment = require('moment')
const match_properties = require('../api/matching/matching_algo').match_properties
const getAddressesWithinRadius = require('../api/rds/rds_api').getAddressesWithinRadius
const elastic_heat_map = require('../api/elastic/elasticsearch_api').elastic_heat_map
const RENTAL_LISTINGS = require('../credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').RENTAL_LISTINGS

// NODE_ENV=development node fn/getListings.js
module.exports = function(event, context, callback) {

  console.log('------ getMeatMap() ------')
  console.log('------ LAMBDA EVENT OBJECT ------')
  console.log(event)
  console.log(event.body)
  console.log(typeof event.body)
  const body = JSON.parse(event.body)
  // console.log(JSON.parse(event.body))
  console.log('------ LAMBDA CONTEXT OBJECT ------')
  console.log(context)
  
  // getAddressesWithinRadius(body.destinations[0].gps.lat, body.destinations[0].gps.lng, body.radius)
  //   .then((data) => {
  //     console.log('--------> getAddressesWithinRadius')
  //     console.log(data)
  //     return match_properties(body, data.map(d => d.address_id))
  //   })
  elastic_heat_map(body)
    .then((data) => {
      return Promise.resolve(data)
    })
    .then((ads) => {
      const response = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: 'Successfully queryed ads',
          data: ads
        }),
      };
      callback(null, response);
    })
    .catch((err) => {
      console.log(err)
      console.log(err.response.data.error)
      callback(err)
    })
}
