/*

curl -X GET "localhost:9200/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
      "range" : {
          "age" : {
              "gte" : 10,
              "lte" : 20,
              "boost" : 2.0
          }
      }
  }
}
'


$ NODE_ENV=development node api/elastic/test.js

*/

const axios = require('axios')
const ELASTICSEARCH_URL = require(`../../credentials/${process.env.NODE_ENV}/elasticsearch_url`).ELASTICSEARCH_URL

const query = {
  "query": {
    "bool": {
      "must": [
        { "match": { "BEDS": 1 } },
        { "range" : { "PRICE" : { "lte" : 1525 } } }
      ],
      "filter" : {
          "geo_distance" : {
              "distance" : "20000m",
              "GEO_POINT" : {
                  "lat" : 43.6628917,
                  "lon" : -79.3956564
              }
          }
      }
    }
  },
  "sort" : [
        {
            "_geo_distance" : {
                "GEO_POINT" : {
                    "lat" : 43.6628917,
                    "lon" : -79.3956564
                },
                "order" : "asc",
                "unit" : "km",
                "mode" : "min",
                "distance_type" : "arc"
            }
        }
    ]
}

axios.get(`${ELASTICSEARCH_URL}/rental_listings_dev/_search`, {
    params: {
      source: JSON.stringify(query),
      source_content_type: 'application/json'
    }
  })
  .then((data) => {
    console.log(data.data)
    console.log(data.data.hits.hits)
    console.log('==== SUCCESS ====')
  })
  .catch((err) => {
    console.log(err)
    console.log('==== ERROR ====')
  })
