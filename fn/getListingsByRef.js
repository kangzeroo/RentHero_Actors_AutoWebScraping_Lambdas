const moment = require('moment')
const match_properties = require('../api/matching/matching_algo').match_properties
const getAddressesWithinRadius = require('../api/rds/rds_api').getAddressesWithinRadius
const query_dynamodb = require('../DynamoDB/general_queryable').query_dynamodb
const RENTAL_LISTINGS = require('../credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').RENTAL_LISTINGS

// NODE_ENV=development node fn/getListings.js
module.exports = function(event, context, callback) {

  console.log('------ getListingsByRef() ------')
  console.log('------ LAMBDA EVENT OBJECT ------')
  console.log(event)
  console.log(event.body)
  console.log(typeof event.body)
  const body = JSON.parse(event.body)
  // console.log(JSON.parse(event.body))
  console.log('------ LAMBDA CONTEXT OBJECT ------')
  console.log(context)

  let params = {
    "TableName": RENTAL_LISTINGS,
    "KeyConditionExpression": `
      #REFERENCE_ID = :reference_id
    `,
    "IndexName": "By_Reference_ID",
    "ExpressionAttributeNames": {
      "#REFERENCE_ID": "REFERENCE_ID"
    },
    "ExpressionAttributeValues": {
      ":reference_id": body.ref_id,
    }
  }
  if (body.short_id) {
    params = {
      "TableName": RENTAL_LISTINGS,
      "KeyConditionExpression": `
        #SHORT_ID = :short_id
      `,
      "IndexName": "By_Short_ID",
      "ExpressionAttributeNames": {
        "#SHORT_ID": "SHORT_ID"
      },
      "ExpressionAttributeValues": {
        ":short_id": body.short_id,
      }
    }
  }
  console.log(params)
  query_dynamodb(params)
    .then((ads) => {
      const response = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          message: 'Successfully queryed ads',
          data: ads[0],
        }),
      };
      callback(null, response);
    })
    .catch((err) => {
      console.log(err)
      callback(err)
    })
}
