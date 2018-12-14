const axios = require('axios')
const Rx = require('rxjs')
const ELASTICSEARCH_URL = require(`../../credentials/${process.env.NODE_ENV}/elasticsearch_url`).ELASTICSEARCH_URL
const ELASTICSEARCH_MAPPING = require(`../../credentials/${process.env.NODE_ENV}/elasticsearch_url`).ELASTICSEARCH_MAPPING

exports.elastic_search_properties = (prefs) => {
  console.log('Hitting ', ELASTICSEARCH_URL)
  const p = new Promise((res, rej) => {
    const Items = []
    let query = {
      "from": 0,
      "size": 30,
      "query": {
        "bool": {
          "must": [
            { "match": { "BEDS": prefs.rooms.avail.ideal } },
            { "range" : { "PRICE" : { "lte" : prefs.budget.max_per_person * prefs.rooms.avail.ideal } } }
          ],
          "filter" : {
              "geo_distance" : {
                  "distance" : `${prefs.radius}m`,
                  "GEO_POINT" : {
                      "lat" : prefs.destinations[0].gps.lat,
                      "lon" : prefs.destinations[0].gps.lng
                  }
              }
          }
        }
      },
      "sort" : [
            {
                "_geo_distance" : {
                    "GEO_POINT" : {
                        "lat" : prefs.destinations[0].gps.lat,
                        "lon" : prefs.destinations[0].gps.lng
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
      "_source": ["GPS.lat", "GPS.lng", "BEDS", "PRICE", "REFERENCE_ID"],
      "query": {
        "bool": {
          "must": [
            { "range" : { "BEDS" : { "lte" : prefs.rooms.avail.max } } },
            { "range" : { "PRICE" : { "lte" : prefs.budget.max_per_person * prefs.rooms.avail.ideal } } }
          ],
          "filter" : {
              "geo_distance" : {
                  "distance" : `${prefs.radius}m`,
                  "GEO_POINT" : {
                      "lat" : prefs.destinations[0].gps.lat,
                      "lon" : prefs.destinations[0].gps.lng
                  }
              }
          }
        }
      },
      "sort" : [
            {
                "_geo_distance" : {
                    "GEO_POINT" : {
                        "lat" : prefs.destinations[0].gps.lat,
                        "lon" : prefs.destinations[0].gps.lng
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
