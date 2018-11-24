const moment = require('moment')
const chrono = require('chrono-node')
const getDirections = require('../google_directions/directions_api').getDirections
const calcDistance = require('../google_directions/directions_api').calcDistance

/*
    score: 0 == empty match (eg. movein missing)
    score: -1 == not match (eg. movein too late)
    score: 1 == complete match (eg. movein exactly hits ideal within +/- flex days)
    score: 0.4 == partial match (eg. movein is not within ideal range but less than max)
*/

exports.scoreMatch = function(listing, prefs) {
  const p = new Promise((res, rej) => {
    let score = {
      listing: listing,
      room_score: {
        data: {},
        score: 0,
      },
      budget_score: {
        data: {
          ideal_diff: 0,
          max_diff: 0,
        },
        score: 0,
      },
      movein_score: {
        data: {},
        score: 0,
      },
      property_score: {
        data: {
          acceptable_types: {
            condo: false,
            apartment: false,
            house: false,
            basement: false,
            den_or_shared: false
          },
          sqft: {
            min: prefs.property.min_sqft,
            actual: listing.SQFT,
            diff: listing.SQFT - prefs.property.min_sqft
          },
          ensuite_bath: {},
          pets: {},
          style: {},
          amenities: {
            gym: false,
            balcony: false,
            parking: false,
            elevator: false,
            pool: false,
            security: false,
            front_desk: false,
            ensuite_laundry: false,
            walkin_closet: false,
            seperate_entrance: false,
          },
          decor: {},
          utilities: {}
        },
        score: {
          acceptable_types: 0,
          sqft: 0,
          ensuite_bath: 0,
          pets: 0,
          style: 0,
          amenities: 0,
          decor: 0,
          utilities: 0,
        }
      },
      personal_score: 0,
      location_score: 0,
      commute_score: {
        data: {
          distance: 0,
          commute_mode: 'transit'
        },
        score: 0,
      },
      nearby_score: 0,
      total_score: 0
    }
    score.room_score = match_rooms(listing, prefs)
    score.budget_score = match_budget(listing, prefs)
    score.movein_score = match_movein(listing, prefs)
    score.property_score = match_property(listing, prefs)
    score.commute_score = match_distance(listing, prefs)
    res(score)
    // match_commute(listing, prefs)
    //   .then((data) => {
    //     // console.log(data)
    //     score.commute_score = data
    //     res(score)
    //   })
    //   .catch((err) => {
    //     rej(err)
    //   })
  })
  return p
}

const match_rooms = function(listing, prefs) {
  let score = 0
  let data = {

  }
  if (listing.BEDS === prefs.rooms.avail.min) {
    score = 0.5
  }
  if (listing.BEDS === prefs.rooms.avail.max) {
    score = 0.5
  }
  if (listing.BEDS >= prefs.rooms.avail.min && listing.BEDS <= prefs.rooms.avail.max) {
    score = 0.7
  }
  if (listing.BEDS === prefs.rooms.avail.ideal) {
    score = 1
  }
  // add part for random_roommates and max_roommates
  return {
    data: data,
    score: score
  }
}

const match_budget = function(listing, prefs) {
  let score = 0
  let data = {
    ideal_diff: 0,
    max_diff: 0,
  }
  let flex = 50
  // flex allows us to be flexible on price
  if (prefs.budget.flexible) {
    flex = 150
  }
  if (listing.PRICE <= prefs.budget.max_per_person) {
    // first we get the difference between the max_budget and actual price, as a % of the max_budget
    const perc_diff = (prefs.budget.max_per_person - listing.PRICE)/prefs.budget.max_per_person
    // then we assume that price differences aren't ever more than 30% difference, so we use 30% as the max metric
    score = (perc_diff/0.3)
    data.max_diff = prefs.budget.max_per_person - listing.PRICE
  }
  if (listing.PRICE <= prefs.budget.ideal_per_person + flex && listing.PRICE >= prefs.budget.ideal_per_person - flex) {
    score = 1
    data.ideal_diff = listing.PRICE - prefs.budget.ideal_per_person
  }
  if (listing.PRICE == 0) {
    score = 0
  }
  return {
    data: data,
    score: score
  }
}

const match_movein = function(listing, prefs) {
  let score = 0
  let data = {

  }
  if (prefs.include_missing_matched) {
    if (typeof listing.MOVEIN == 'object' || !listing.MOVEIN) {
      score = 0
    } else {
      // console.log('Getting movein date...', listing.MOVEIN, typeof listing.MOVEIN)
      if (moment(listing.MOVEIN).isAfter(moment(prefs.earliest_movein)) && moment(listing.MOVEIN).isBefore(moment(prefs.latest_movein))) {
        score = 0.3
      } else {
        score = -1
      }
      const days_diff = moment(listing.MOVEIN).diff(prefs.ideal_movein, 'days')
      const days_score = Math.abs(days_diff/14)
      if (days_score < 1) {
        score = 1-days_score + 0.1
      }
    }
  } else {
    if (listing.MOVEIN == {} || !listing.MOVEIN) {
      score = 0
    } else {
      if (moment(listing.MOVEIN).isAfter(moment(prefs.earliest_movein)) && moment(listing.MOVEIN).isBefore(moment(prefs.latest_movein))) {
        score = 0.1
      } else {
        score = -1
      }
      const days_diff = moment(listing.MOVEIN).diff(prefs.ideal_movein, 'days')
      const days_score = Math.abs(days_diff/14)
      if (days_score < 1) {
        score = 1-days_score + 0.1
      }
    }
  }
  return {
    data: data,
    score: score
  }
}

const match_property = function(listing, prefs) {
  let scores = {
    acceptable_types: 0,
    sqft: 0,
    ensuite_bath: 0,
    pets: 0,
    style: 0,
    amenities: 0,
    decor: 0,
    utilities: 0,
  }
  let data = {
    acceptable_types: {
      condo: false,
      apartment: false,
      house: false,
      basement: false,
      den_or_shared: false
    },
    sqft: {
      min: prefs.property.min_sqft,
      actual: listing.SQFT,
      diff: listing.SQFT - prefs.property.min_sqft
    },
    ensuite_bath: {},
    pets: {},
    style: {},
    amenities: {
      gym: false,
      balcony: false,
      parking: false,
      elevator: false,
      pool: false,
      security: false,
      front_desk: false,
      ensuite_laundry: false,
      walkin_closet: false,
      seperate_entrance: false,
    },
    decor: {},
    utilities: {}
  }
  // check acceptable types
  if (prefs.property.acceptable_types.filter(t => t === 'condo')) {
    if (listing.DESCRIPTION.toLowerCase().indexOf('condo') > -1) {
      scores.acceptable_types = 1
      data.acceptable_types.condo = true
    }
  }
  if (prefs.property.acceptable_types.filter(t => t === 'apartment')) {
    if (listing.DESCRIPTION.toLowerCase().indexOf('apartment') > -1) {
      scores.acceptable_types = 1
      data.acceptable_types.apartment = true
    }
  }
  if (prefs.property.acceptable_types.filter(t => t === 'house')) {
    if (listing.DESCRIPTION.toLowerCase().indexOf('house') > -1) {
      scores.acceptable_types = 1
      data.acceptable_types.house = true
    }
  }
  if (prefs.property.acceptable_types.filter(t => t === 'basement')) {
    if (listing.DESCRIPTION.toLowerCase().indexOf('basement') > -1) {
      scores.acceptable_types = 1
      data.acceptable_types.basement = true
    }
  }
  if (prefs.property.acceptable_types.filter(t => t === 'den_or_shared')) {
    if (listing.DESCRIPTION.toLowerCase().indexOf('den') > -1) {
      scores.acceptable_types = 1
      data.acceptable_types.den_or_shared = true
    }
  }

  // check sqft
  if (listing.SQFT) {
    scores.sqft = (listing.SQFT - prefs.property.min_sqft)/prefs.property.min_sqft
  }

  // check if ensuite bath
  if (prefs.property.ensuite_bath) {
    const ensuite_matches = getAllIndexes(listing.DESCRIPTION, /(ensuite)|(en-suite)|(private)/igm)
    const matches = ensuite_matches.map((index) => {
      let matched = -1
      const str = listing.DESCRIPTION.split(' ').slice(
        Math.max(0, index-4),
        Math.min(listing.DESCRIPTION.split(' ').length, index+4)
      )
      if (regexIndexOf(str, /(bath)|(wash)/igm) > -1) {
        return 1
      }
      return matched
    })
    if (matches.length > 0 && matches.filter(m => m > 0).length > 0) {
      scores.ensuite_bath = 1
    } else {
      scores.ensuite_bath = -1
    }
  }

  // check if pets
  let pets_allowed = -1
  const pets_loc = listing.DESCRIPTION.toLowerCase().indexOf('pet')
  if (pets_loc > -1) {
    const pre = listing.DESCRIPTION.split(' ').slice(Math.max(pets_loc-3, 0), pets_loc).join(' ')
    const post = listing.DESCRIPTION.split('').slice(pets_loc, Math.max(pets_loc+3, listing.DESCRIPTION.split('').length-1)).join(' ')
    // testing for preceding positives
    if (pre.match(/(allowed)|(permitted)/gmi) && pre.match(/(allowed)|(permitted)/gmi).filter(i => i).length > 0) {
      pets_allowed = 1
    }
    // testing for postceding positives
    if (post.match(/(allowed)?(permitted)?/gmi) && post.match(/(allowed)?(permitted)?/gmi).filter(i => i).length > 0) {
      pets_allowed = 1
    }
    // testing for preceding negatives
    if (pre.match(/(no)?(not)?(forbidden)?(restricted)?/gmi) && pre.match(/(no)?(not)?(forbidden)?(restricted)?/gmi).filter(i => i).length > 0) {
      pets_allowed = -1
    }
    // testing for postceding negatives
    if (post.match(/(no)?(not)?(forbidden)?(restricted)?(\s+n(\s|$))?/gmi) && post.match(/(no)?(not)?(forbidden)?(restricted)?(\s+n(\s|$))?/gmi).filter(i => i).length > 0) {
      pets_allowed = -1
    }
  }
  scores.pets = pets_allowed


  // check if style


  // check if amenities
  listing.DESCRIPTION.toLowerCase().split(' ').forEach((word) => {
    // gym
    amenities_word_dic.gym.forEach(c => {
      if (word == c) {
        data.amenities.gym = true
      }
    })
    // balcony
    amenities_word_dic.balcony.forEach(c => {
      if (word == c) {
        data.amenities.balcony = true
      }
    })
    // parking
    amenities_word_dic.parking.forEach(c => {
      if (word == c) {
        data.amenities.parking = true
      }
    })
    // elevator
    amenities_word_dic.elevator.forEach(c => {
      if (word == c) {
        data.amenities.elevator = true
      }
    })
    // pool
    amenities_word_dic.pool.forEach(c => {
      if (word == c) {
        data.amenities.pool = true
      }
    })
    // security
    amenities_word_dic.security.forEach(c => {
      if (word == c) {
        data.amenities.security = true
      }
    })
    // front_desk
    amenities_word_dic.front_desk.forEach(c => {
      if (word == c) {
        data.amenities.front_desk = true
      }
    })
    // ensuite_laundry
    amenities_word_dic.ensuite_laundry.forEach(c => {
      if (word == c) {
        data.amenities.ensuite_laundry = true
      }
    })
    // walkin_closet
    amenities_word_dic.walkin_closet.forEach(c => {
      if (word == c) {
        data.amenities.walkin_closet = true
      }
    })
    // seperate_entrance
    amenities_word_dic.seperate_entrance.forEach(c => {
      if (word == c) {
        data.amenities.seperate_entrance = true
      }
    })
  })
  if (data.amenities.gym === true && prefs.property.amenities.filter(a => a.indexOf('gym')) > 0) {
    scores.amenities += 1/prefs.property.amenities.length
  }
  if (data.amenities.balcony === true && prefs.property.amenities.filter(a => a.indexOf('balcony')) > 0) {
    scores.amenities += 1/prefs.property.amenities.length
  }
  if (data.amenities.parking === true && prefs.property.amenities.filter(a => a.indexOf('parking')) > 0) {
    scores.amenities += 1/prefs.property.amenities.length
  }
  if (data.amenities.elevator === true && prefs.property.amenities.filter(a => a.indexOf('elevator')) > 0) {
    scores.amenities += 1/prefs.property.amenities.length
  }
  if (data.amenities.pool === true && prefs.property.amenities.filter(a => a.indexOf('pool')) > 0) {
    scores.amenities += 1/prefs.property.amenities.length
  }
  if (data.amenities.security === true && prefs.property.amenities.filter(a => a.indexOf('security')) > 0) {
    scores.amenities += 1/prefs.property.amenities.length
  }
  if (data.amenities.front_desk === true && prefs.property.amenities.filter(a => a.indexOf('front_desk')) > 0) {
    scores.amenities += 1/prefs.property.amenities.length
  }
  if (data.amenities.ensuite_laundry === true && prefs.property.amenities.filter(a => a.indexOf('ensuite_laundry')) > 0) {
    scores.amenities += 1/prefs.property.amenities.length
  }
  if (data.amenities.walkin_closet === true && prefs.property.amenities.filter(a => a.indexOf('walkin_closet')) > 0) {
    scores.amenities += 1/prefs.property.amenities.length
  }
  if (data.amenities.seperate_entrance === true && prefs.property.amenities.filter(a => a.indexOf('seperate_entrance')) > 0) {
    scores.amenities += 1/prefs.property.amenities.length
  }

  // check if decor


  // check if utilities
  // electricity, water, heating, ac, insurance, internet
  scores.utilities = listing.UTILITIES.length/['electricity', 'water', 'heating', 'ac', 'insurance', 'internet'].length

  return {
    data: data,
    score: scores
  }
}

const match_location = function(listing, prefs) {

}

const match_commute = function(listing, prefs) {
  return getDirections(listing.PLACE_ID, prefs.commute)
          .then((commutes) => {
            return Promise.resolve({
              score: 0,
              data: commutes
            })
          })
          .catch((err) => {
            return Promise.reject(err)
          })
}

const match_distance = function(listing, prefs) {
  let score = {
    data: {
      distance: 0,
      commute_mode: 'transit'
    },
    score: 0,
  }
  const distance = calcDistance(listing.GPS.lat, listing.GPS.lng, prefs.destinations[0].gps.lat, prefs.destinations[0].gps.lng, 'K')
  if (prefs.destinations[0].commute_mode.toLowerCase() === 'transit') {
    score.data.distance = distance
    score.data.commute_mode = 'transit'
    score.score = 1-(distance/25)
  } else if (prefs.destinations[0].commute_mode.toLowerCase() === 'driving') {
    score.data.distance = distance
    score.data.commute_mode = 'driving'
    score.score = 1-(distance/50)
  }
  return score
}

const match_nearby = function(listing, prefs) {

}

const calculate_total_score = function(listing, prefs) {

}

const isEmpty = (obj) => {
  for(var key in obj) {
      if(obj.hasOwnProperty(key))
          return false;
  }
  return true;
}

const getAllIndexes = (str, val) => {
    var indexes = [], i = -1;
    while ((i = regexIndexOf(str, val, i+1)) != -1){
        indexes.push(i);
    }
    return indexes;
}

const regexIndexOf = (str, regex, startpos) => {
  var indexOf = str.substring(startpos || 0).search(regex);
  return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}

const amenities_word_dic = {
  gym: ['gym', 'fitness', 'exercise'],
  balcony: ['balcony', 'patio'],
  parking: ['parking'],
  elevator: ['elevator'],
  pool: ['pool', 'swimming'],
  security: ['security', 'cameras', 'surveillence', 'cctv'],
  front_desk: ['concierge', 'front desk', 'management'],
  ensuite_laundry: ['ensuite laundry', 'en-suite laundry', 'unit laundry', 'laundry'],
  walkin_closet: ['walk-in closet', 'walkin closet', 'ensuite closet', 'en-suite closet'],
  seperate_entrance: ['seperate entrance', 'own entrance', 'entrance seperate']
}
