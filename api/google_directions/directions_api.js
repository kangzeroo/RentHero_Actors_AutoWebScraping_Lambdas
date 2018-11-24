const axios = require('axios')
const SERVER_KEY = require('../../credentials/' + process.env.NODE_ENV + '/ai-server-key.json').key

exports.getDirections = function(origin_placeid, destinations) {
  /*
    destinations = [
      { "destination": "ChIJC9nc5rU0K4gRgyoVQ0e7q8c", "transport": "driving || public transit || walking", "avoids": ["tolls"], "arrival_time": 435356456 }
    ]
  */
  const promiseArray = destinations.map((dest) => {
    const params = `origin=place_id:${origin_placeid}&destination=place_id:${dest.destination_placeids}&key=${SERVER_KEY}&mode=${dest.transport}&arrival_time=${dest.arrival_time}${dest.avoids.length > 0 ? `&avoid=${dest.avoids.join(',')}` : ''}`
    // console.log(params)
    return axios.get(`https://maps.googleapis.com/maps/api/directions/json?${params}`)
      .then((data) => {
        return Promise.resolve(data.data)
      })
      .catch((err) => {
        console.log(err)
        return Promise.reject(err)
      })
  })
  return Promise.all(promiseArray)
}

exports.calcDistance = function(lat1, lon1, lat2, lon2, unit) {
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
