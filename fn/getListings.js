const moment = require('moment')
const scan_dynamodb = require('../DynamoDB/general_queryable').scan_dynamodb
const RENTAL_LISTINGS = require('../credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').RENTAL_LISTINGS

// NODE_ENV=development node fn/getListings.js
module.exports = function(event, context, callback) {

  console.log('------ getListings() ------')
  console.log('------ LAMBDA EVENT OBJECT ------')
  console.log(event)
  console.log(event.body)
  // console.log(JSON.parse(event.body))
  console.log('------ LAMBDA CONTEXT OBJECT ------')
  console.log(context)

  const date_since = moment().unix() - 60*60*24*10
  const params = {
    "TableName": RENTAL_LISTINGS,
    "FilterExpression": "#DATE_POSTED_UNIX > :date_posted_unix",
    "ExpressionAttributeNames": {
      "#DATE_POSTED_UNIX": "DATE_POSTED_UNIX"
    },
    "ExpressionAttributeValues": {
      ":date_posted_unix": date_since
    },
    "Limit": 10
  }

  scan_dynamodb(params)
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
