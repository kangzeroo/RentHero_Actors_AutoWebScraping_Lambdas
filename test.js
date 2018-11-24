const moment = require('moment')
const scan_dynamodb = require('./DynamoDB/general_queryable').scan_dynamodb
const RENTAL_LISTINGS = require('./credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').RENTAL_LISTINGS

// NODE_ENV=development node test.js


// const date_since = moment().unix() - 60*60*24*6
// const params = {
//   "TableName": RENTAL_LISTINGS,
//   "FilterExpression": "#DATE_POSTED_UNIX > :date_posted_unix",
//   "ExpressionAttributeNames": {
//     "#DATE_POSTED_UNIX": "DATE_POSTED_UNIX"
//   },
//   "ExpressionAttributeValues": {
//     ":date_posted_unix": date_since
//   },
//   "Limit": 10
// }
//
// console.log(params)
//
// scan_dynamodb(params)
//   .then((data) => {
//     return Promise.resolve(data)
//   })
//   .then((ads) => {
//     console.log(ads)
//   })
//   .catch((err) => {
//     console.log(err)
//   })
//
//
//
//
//


const getDistance = function distance(lat1, lon1, lat2, lon2, unit) {
        var radlat1 = Math.PI * lat1/180
        var radlat2 = Math.PI * lat2/180
        var radlon1 = Math.PI * lon1/180
        var radlon2 = Math.PI * lon2/180
        var theta = lon1-lon2
        var radtheta = Math.PI * theta/180
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        dist = Math.acos(dist)
        dist = dist * 180/Math.PI
        dist = dist * 60 * 1.1515
        if (unit=="K") { dist = dist * 1.609344 }
        if (unit=="N") { dist = dist * 0.8684 }
        console.log(dist)
        return dist
}
getDistance(43.472053, -80.543374, 43.472151, -80.536363, "K")
