const axios = require('axios')
const Rx = require('rxjs')
const moment = require('moment')
const ELASTICSEARCH_URL = require(`../../credentials/${process.env.NODE_ENV}/elasticsearch_url`).ELASTICSEARCH_URL
const ELASTICSEARCH_MAPPING = require(`../../credentials/${process.env.NODE_ENV}/elasticsearch_url`).ELASTICSEARCH_MAPPING

exports.elastic_search_properties = (prefs) => {
  console.log('Hitting ', ELASTICSEARCH_URL)

  const mustParams = [
    { "range" : { "SCRAPED_AT" : { "gte" : moment().subtract(30, 'days').toISOString() } } },
    { "range" : { "PRICE" : { "lte" : prefs.FINANCIALS.IDEAL_PER_PERSON * prefs.GROUP.CERTAIN_MEMBERS, "gte": 100 } } }
  ]

  if (prefs.GROUP.WHOLE_OR_RANDOM_AS.toLowerCase().indexOf('both') > -1) {
    mustParams.push({ "range" : { "BEDS" : { "gte" : prefs.GROUP.CERTAIN_MEMBERS } } })
  } else if (prefs.GROUP.WHOLE_OR_RANDOM_AS.toLowerCase().indexOf('partial') > -1) {
    mustParams.push({ "range" : { "BEDS" : { "gte" : prefs.GROUP.CERTAIN_MEMBERS } } })
  } else if (prefs.GROUP.WHOLE_OR_RANDOM_AS.toLowerCase().indexOf('entire') > -1) {
    mustParams.push({ "match": { "BEDS": prefs.GROUP.CERTAIN_MEMBERS } })
  } else {
    mustParams.push({ "match": { "BEDS": prefs.GROUP.CERTAIN_MEMBERS } })
  }

  if (prefs.MOVEIN.LEASE_LENGTH === 12) {
    mustParams.push({ "match": { "LEASE_LENGTH": prefs.MOVEIN.LEASE_LENGTH } })
  } else if (prefs.MOVEIN.LEASE_LENGTH === 8) {
    mustParams.push({ "range" : { "BEDS" : { "lte" : 12, "gte": 8 } } })
  } else if (prefs.MOVEIN.LEASE_LENGTH === 4) {
    mustParams.push({ "match": { "LEASE_LENGTH": prefs.MOVEIN.LEASE_LENGTH } })
  } else {
    mustParams.push({ "range" : { "BEDS" : { "lte" : prefs.MOVEIN.LEASE_LENGTH + 2, "gte": prefs.MOVEIN.LEASE_LENGTH - 2 } } })
  }

  if (prefs.GROUP.BATHROOMS > 0) {
    mustParams.push({ "range" : { "BATHS" : { "lte" : prefs.GROUP.BATHROOMS + 1, "gte": prefs.GROUP.BATHROOMS - 1 } } })
  }

  const p = new Promise((res, rej) => {
    const Items = []
    let query = {
      "from": 0,
      "size": 30,
      "query": {
        "bool": {
          "must": mustParams,
          "filter" : {
              "geo_distance" : {
                  "distance" : `30000m`,
                  "GEO_POINT" : {
                      "lat" : prefs.LOCATION.DESTINATION_GEOPOINT.split(',')[0],
                      "lon" : prefs.LOCATION.DESTINATION_GEOPOINT.split(',')[1],
                  }
              }
          }
        }
      },
      "sort" : [
            {
                "_geo_distance" : {
                    "GEO_POINT" : {
                        "lat" : prefs.LOCATION.DESTINATION_GEOPOINT.split(',')[0],
                        "lon" : prefs.LOCATION.DESTINATION_GEOPOINT.split(',')[1],
                    },
                    "order" : "asc",
                    "unit" : "m",
                    "mode" : "min",
                    "distance_type" : "arc"
                }
            },
            {
              "DATE_POSTED" : { "order" : "desc" }
            }
        ]
    }
    const onNext = ({ obs, query }) => {
      console.log('OBSERVABLE NEXT')
      console.log('=========== accumlated size: ' + Items.length)
      axios.get(`${ELASTICSEARCH_URL}/${ELASTICSEARCH_MAPPING}/_search`, {
          params: {
            source: JSON.stringify(query),
            source_content_type: 'application/json'
          }
        })
        .then((data) => {
          console.log(data.data)
          console.log(data.data.hits.hits)
          data.data.hits.hits.map(h => h._source).forEach(h => Items.push(h))
          console.log('==== SUCCESS ====')
          if (data.data.hits.total > Items.length) {
            let updated_query = query
            updated_query.from = Items.length
            obs.next({
              obs,
              query: updated_query
            })
          } else {
            obs.complete()
          }
        })
        .catch((err) => {
          console.log(err)
          console.log('==== ERROR ====')
          obs.error(err)
        })
    }
    Rx.Observable.create((obs) => {
      obs.next({
        obs,
        query
      })
    }).subscribe({
      next: onNext,
      error: (err) => {
        console.log('OBSERVABLE ERROR')
        console.log(err)
        rej(err)
      },
      complete: () => {
        console.log('OBSERVABLE COMPLETE')
        console.log(Items.length)
        res(Items)
      }
    })
  })
  return p
}

exports.grab_listings_by_refs = (ref_ids) => {
  const should_refs = ref_ids.map((id) => {
    return {"match_phrase" : {"REFERENCE_ID" : id }}
  })
  const query = {
    "query": {
      "bool" : {
          "should" : should_refs,
          "minimum_should_match" : 1
      }
    }
  }
  const p = new Promise((res, rej) => {
    axios.get(`${ELASTICSEARCH_URL}/${ELASTICSEARCH_MAPPING}/_search`, {
        params: {
          source: JSON.stringify(query),
          source_content_type: 'application/json'
        }
      })
      .then((data) => {
        console.log(data.data)
        console.log(data.data.hits.hits)
        res(data.data.hits.hits.map(h => h._source))
        console.log('==== SUCCESS ====')
      })
      .catch((err) => {
        console.log(err)
        rej(err)
        console.log('==== ERROR ====')
      })
  })
  return p
}


exports.elastic_heat_map = (prefs) => {
  console.log('Hitting ', ELASTICSEARCH_URL)

  const p = new Promise((res, rej) => {
    const Items = []
    let query = {
      "from": 0,
      "size": 30,
      "_source": ["GPS.lat", "GPS.lng"],
      // "_source": ["GPS.lat", "GPS.lng", "BEDS", "PRICE", "REFERENCE_ID"],
      "query": {
        "bool": {
          "must": [
            { "range" : { "SCRAPED_AT" : { "gte" : moment().subtract(30, 'days').toISOString() } } },
          ],
          "filter" : {
              "geo_distance" : {
                  "distance" : `30000m`,
                  "GEO_POINT" : {
                      "lat" : prefs.LOCATION.DESTINATION_GEOPOINT.split(',')[0],
                      "lon" : prefs.LOCATION.DESTINATION_GEOPOINT.split(',')[1],
                  },
              }
          }
        }
      },
      "sort" : [
            {
                "_geo_distance" : {
                    "GEO_POINT" : {
                        "lat" : prefs.LOCATION.DESTINATION_GEOPOINT.split(',')[0],
                        "lon" : prefs.LOCATION.DESTINATION_GEOPOINT.split(',')[1],
                    },
                    "order" : "asc",
                    "unit" : "m",
                    "mode" : "min",
                    "distance_type" : "arc"
                }
            }
        ]
    }
    const onNext = ({ obs, query }) => {
      console.log('OBSERVABLE NEXT')
      console.log('=========== accumlated size: ' + Items.length)
      axios.get(`${ELASTICSEARCH_URL}/${ELASTICSEARCH_MAPPING}/_search`, {
          params: {
            source: JSON.stringify(query),
            source_content_type: 'application/json'
          }
        })
        .then((data) => {
          console.log(data.data)
          console.log(data.data.hits.hits)
          data.data.hits.hits.map(h => h._source).forEach(h => Items.push(h))
          console.log('==== SUCCESS ====')
          if (data.data.hits.total > Items.length) {
            let updated_query = query
            updated_query.from = Items.length
            obs.next({
              obs,
              query: updated_query
            })
          } else {
            obs.complete()
          }
        })
        .catch((err) => {
          console.log(err)
          console.log('==== ERROR ====')
          obs.error(err)
        })
    }
    Rx.Observable.create((obs) => {
      obs.next({
        obs,
        query
      })
    }).subscribe({
      next: onNext,
      error: (err) => {
        console.log('OBSERVABLE ERROR')
        console.log(err)
        rej(err)
      },
      complete: () => {
        console.log('OBSERVABLE COMPLETE')
        console.log(Items.length)
        res(Items)
      }
    })
  })
  return p
}
