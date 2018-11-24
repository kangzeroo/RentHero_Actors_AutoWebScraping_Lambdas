const moment = require('moment')
const chrono = require('chrono-node')

exports.sortMatches = function(matches) {
  const noPrices = []
  const noImages = []
  const goods = []
  matches.forEach((match) => {
    if (match.listing.PRICE === 0) {
      noPrices.push(match)
    } else if (match.listing.IMAGES.length === 0) {
      noImages.push(match)
    } else {
      goods.push(match)
    }
  })
  const sortedGood = goods.sort((a, b) => {
    return a.commute_score.data.distance - b.commute_score.data.distance
  })
  return Promise.resolve(sortedGood.concat(noPrices).concat(noImages))
}
