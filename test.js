const moment = require('moment')
const scan_dynamodb = require('./DynamoDB/general_queryable').scan_dynamodb
const RENTAL_LISTINGS = require('./credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').RENTAL_LISTINGS

// NODE_ENV=development node test.js


const date_since = moment().unix() - 60*60*24*6
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

console.log(params)

scan_dynamodb(params)
  .then((data) => {
    return Promise.resolve(data)
  })
  .then((ads) => {
    console.log(ads)
  })
  .catch((err) => {
    console.log(err)
  })




  
