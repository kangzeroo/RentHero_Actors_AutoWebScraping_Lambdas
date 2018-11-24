const moment = require('moment')
const match_properties = require('../api/matching/matching_algo').match_properties
const RENTAL_LISTINGS = require('../credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').RENTAL_LISTINGS

// NODE_ENV=development node fn/getListings.js
module.exports = function(event, context, callback) {

  console.log('------ getListings() ------')
  console.log('------ LAMBDA EVENT OBJECT ------')
  console.log(event)
  console.log(event.body)
  console.log(typeof event.body)
  // console.log(JSON.parse(event.body))
  console.log('------ LAMBDA CONTEXT OBJECT ------')
  console.log(context)

  match_properties(JSON.parse(event.body))
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
          data: ads,
        }),
      };
      callback(null, response);
    })
    .catch((err) => {
      console.log(err)
      callback(err)
    })

}
