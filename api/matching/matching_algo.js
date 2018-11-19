const moment = require('moment')
const RENTAL_LISTINGS = require('../../credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').RENTAL_LISTINGS
const scan_dynamodb = require('../../DynamoDB/general_queryable').scan_dynamodb
const scoreMatch = require('../nlp/weak_matching').scoreMatch

/*
    prefs = {
      rooms: {
        avail: {
          min: 1,
          ideal: 2,
          max: 2,
        },
        random_roommates: true,
        max_roommates: 3,
      },
      budget: {
        ideal_per_person: 800,
        max_per_person: 1100,
        flexible: true,
      },
      movein: {
        ideal_movein: 'ISOString',
        earliest_movein: "ISOString",
        latest_movein: "ISOString",
      },
      location: {
        ideal_neighbourhoods: ['Downtown', 'Annex'],
        flexible: true,
      },
      commute: [
        { destination: '123 Main St, Toronto', transport: 'driving || public transit || walking', time: 'typical_working_hours || non_typical_working_hours' }
      ],
      nearby: ['nightlife', 'cafes', ''],
      property: {
        acceptable_type: ['condo', 'apartment', 'house', 'basement', 'den_or_shared'],
        min_sqft: 800,
        ensuite_bath: false,
        pets: false,
        style: ['family', 'young_professional', 'senior', 'student', 'immigrant', 'luxury'],
        amenities: ['gym', 'balcony', 'parking', 'elevator', 'pool', 'security', 'front_desk'],
        decor: ['chic', 'cozy', 'no_preference'],
        utilities: ['price_all_inclusive', 'available_maybe_inclusive']
      },
      personal: {
        guarantor_needed: true,
        cosigner_needed: true,
        allergies: '',
      },
      posted_in_last_x_days: 5,
      include_missing_matched: true
    }
*/

const match_properties = (prefs) => {
  console.log('Scanning DynamoDB...')
  const date_since = moment().unix() - 60*60*24*prefs.posted_in_last_x_days
  const params = {
    "TableName": RENTAL_LISTINGS,
    "FilterExpression": `
      #DATE_POSTED_UNIX > :date_posted_unix
      AND
      #BEDS >= :min_beds
      AND
      #BEDS <= :max_beds
      AND
      #PRICE <= :budget
    `,
    "ExpressionAttributeNames": {
      "#DATE_POSTED_UNIX": "DATE_POSTED_UNIX",
      "#BEDS": "BEDS",
      "#PRICE": "PRICE"
    },
    "ExpressionAttributeValues": {
      ":date_posted_unix": date_since,
      ":min_beds": prefs.rooms.avail.min,
      ":max_beds": prefs.rooms.avail.max,
      ":budget": prefs.budget.max_per_person,
    }
  }
  let matches = []
  scan_dynamodb(params)
    .then((data) => {
      // console.log(data)
      return Promise.all(data.map(d => scoreMatch(d, prefs)))
    })
    .then((data) => {
      console.log(data)
      matches = data
    })
    .catch((err) => {
      console.log(err)
    })
}


const myPrefs = {
  rooms: {
    avail: {
      min: 1,
      ideal: 2,
      max: 2,
    },
    random_roommates: true,
    max_roommates: 3,
  },
  budget: {
    ideal_per_person: 800,
    max_per_person: 1100,
    flexible: true,
  },
  movein: {
    ideal_movein: 'ISOString',
    earliest_movein: "ISOString",
    latest_movein: "ISOString",
  },
  location: {
    ideal_neighbourhoods: ['Downtown', 'Annex'],
    flexible: true,
  },
  commute: [
    { destination: '123 Main St, Toronto', transport: 'driving || public transit || walking', time: 'typical_working_hours || non_typical_working_hours' }
  ],
  nearby: ['nightlife', 'cafes', ''],
  property: {
    acceptable_type: ['condo', 'apartment', 'house', 'basement', 'den_or_shared'],
    min_sqft: 800,
    ensuite_bath: false,
    pets: false,
    style: ['family', 'young_professional', 'senior', 'student', 'immigrant', 'luxury'],
    amenities: ['gym', 'balcony', 'parking', 'elevator', 'pool', 'security', 'front_desk'],
    decor: ['chic', 'cozy', 'no_preference'],
    utilities: ['price_all_inclusive', 'available_maybe_inclusive']
  },
  personal: {
    guarantor_needed: true,
    cosigner_needed: true,
    allergies: '',
  },
  posted_in_last_x_days: 5,
  include_missing_matched: true
}
match_properties(myPrefs)

// NODE_ENV=production node api/matching/matching_algo.js
