const moment = require('moment')
const chrono = require('chrono-node')

exports.scoreMatch = function(listing, prefs) {
  const p = new Promise((res, rej) => {
    let score = {
      listing: listing,
      room_score: 0,
      budget_score: 0,
      movein_score: 0,
      property_score: 0,
      personal_score: 0,
      location_score: 0,
      commute_score: 0,
      nearby_score: 0,
      total_score: 0
    }
    score.room_score = match_rooms(listing, prefs)
    score.budget_score = match_budget(listing, prefs)
    score.movein_score = match_movein(listing, prefs)
    res(score)
  })
  return p
}

const match_rooms = function(listing, prefs) {
  let score = 0
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
  return score
}

const match_budget = function(listing, prefs) {
  let score = 0
  let flex = 50
  // flex allows us to be flexible on price
  if (prefs.budget.flexible) {
    flex = 150
  }
  if (listing.PRICE <= prefs.budget.max_per_person) {
    // first we get the difference between the max_budget and actual price, as a % of the max_budget
    const diff = (prefs.budget.max_per_person - listing.PRICE)/prefs.budget.max_per_person
    // then we assume that price differences aren't ever more than 30% difference, so we use 30% as the max metric
    score = (diff/0.3)
  }
  if (listing.PRICE <= prefs.budget.ideal_per_person + flex && listing.PRICE >= prefs.budget.ideal_per_person - flex) {
    score = 1
  }
  if (listing.PRICE == 0) {
    score = 0
  }
  return score
}

const match_movein = function(listing, prefs) {
  let score = 0
  if (prefs.include_missing_matched) {
    if (typeof listing.MOVEIN == 'object' || !listing.MOVEIN) {
      score = 0
    } else {
      console.log('Getting movein date...', listing.MOVEIN, typeof listing.MOVEIN)
      if (moment(listing.MOVEIN).isAfter(moment(prefs.earliest_movein)) && moment(listing.MOVEIN).isBefore(moment(prefs.latest_movein))) {
        score = 0.1
      } else {
        score = 'NOT_MATCHED'
      }
      const days_diff = moment(listing.MOVEIN).diff(prefs.ideal_movein, 'days')
      const days_score = Math.abs(days_diff/14)
      if (days_score < 1) {
        score = 1-days_score + 0.1
      }
    }
  } else {
    if (listing.MOVEIN == {} || !listing.MOVEIN) {
      score = 'NOT_MATCHED'
    } else {
      if (moment(listing.MOVEIN).isAfter(moment(prefs.earliest_movein)) && moment(listing.MOVEIN).isBefore(moment(prefs.latest_movein))) {
        score = 0.1
      } else {
        score = 'NOT_MATCHED'
      }
      const days_diff = moment(listing.MOVEIN).diff(prefs.ideal_movein, 'days')
      const days_score = Math.abs(days_diff/14)
      if (days_score < 1) {
        score = 1-days_score + 0.1
      }
    }
  }
  return score
}

const match_property = function(listing, prefs) {

}

const match_location = function(listing, prefs) {

}

const match_commute = function(listing, prefs) {

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
