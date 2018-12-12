const moment = require('moment')
const grab_listings_by_refs = require('../api/elastic/elasticsearch_api').grab_listings_by_refs
const RENTAL_LISTINGS = require('../credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').RENTAL_LISTINGS

// NODE_ENV=development node fn/getListings.js
module.exports = function(event, context, callback) {

  console.log('------ getListingsByRefs() ------')
  console.log('------ LAMBDA EVENT OBJECT ------')
  console.log(event)
  console.log(event.body)
  console.log(typeof event.body)
  const body = JSON.parse(event.body)
  // console.log(JSON.parse(event.body))
  console.log('------ LAMBDA CONTEXT OBJECT ------')
  console.log(context)

  grab_listings_by_refs(body.ref_ids)
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
