const moment = require('moment')
const chrono = require('chrono-node')

exports.extract_price = function(text) {
  if (text) {
    const p = text.replace(/[\t\n\r]/gmi,' ').trim().match(/\${1}\s?(\d)*(\,?\.?)(\d)+/ig)
    if (p) {
      const price = parseInt(p[0].replace(/\D/gmi, ''))
      return price
    } else {
      return 0
    }
  } else {
    return 0
  }
}

exports.extract_beds = function(text) {
  if (text) {
    const beds = text.replace(/[\t\n\r]/gmi,' ').trim().match(/\d+\.?\d?/ig)
    if (beds) {
      return parseInt(beds[0])
    } else {
      return 0
    }
  } else {
    return 0
  }
}

exports.extract_baths = function(text) {
  if (text) {
    const baths = text.replace(/[\t\n\r]/gmi,' ').trim().match(/\d+\.?\d?/ig)
    if (baths) {
      return parseInt(baths[0])
    } else {
      return 0
    }
  } else {
    return 0
  }
}

// NODE_ENV=development node api/nlp/weak_nlp.js
exports.extract_furnished = function(text) {
  if (text) {
    console.log('------------------')
    const chars = text.replace(/[\t\n\r]/gmi,' ').trim().split(' ')
    let furnished_loc
    let is_furnished = false
    chars.forEach((char, index) => {
      const x = char.match(/(furnished)|(furniture)/gmi)
      if (x) {
        furnished_loc = index
      }
    })
    if (furnished_loc > -1) {
      const pre = chars.slice(Math.max(furnished_loc-2, 0), furnished_loc).join(' ')
      const post = chars.slice(furnished_loc, Math.max(furnished_loc+2, chars.length-1)).join(' ')
      // testing for preceding positives
      if (pre.match(/(fully)?(include)?(inclusive)?/gmi) && pre.match(/(fully)?(include)?(inclusive)?/gmi).filter(i => i).length > 0) {
        is_furnished = true
      }
      // testing for postceding positives
      if (post.match(/(include)?(inclusive)?/gmi) && post.match(/(include)?(inclusive)?/gmi).filter(i => i).length > 0) {
        is_furnished = true
      }
      // testing for preceding negatives
      if (pre.match(/(no)?(not)?/gmi) && pre.match(/(no)?(not)?/gmi).filter(i => i).length > 0) {
        is_furnished = false
      }
      // testing for postceding negatives
      if (post.match(/(no)?(not)?(\s+n(\s|$))?/gmi) && post.match(/(no)?(not)?(\s+n(\s|$))?/gmi).filter(i => i).length > 0) {
        is_furnished = false
      }
    }
    // console.log(`${is_furnished}: ${text}`)
    return is_furnished
  } else {
    return false
  }
}

exports.extract_utils = function(text) {
  // utils = electricity, water, heating, ac, insurance, internet
  if (text) {
    const x = text.replace(/[\t\n\r]/gm, ' ').trim()
    const utilities = []
    if (x.match(/(Common Elements Included Yes)/igm)) {
      console.log('COMMON')
      utilities.push('electricity')
      utilities.push('water')
      utilities.push('heating')
    } else {
      if (x.match(/(hydro)|(elec)|(electric)|(electricity)/igm)) {
        console.log('HYDRO')
        utilities.push('electricity')
      }
      if (x.match(/(water)/igm)) {
        console.log('WATER')
        utilities.push('water')
      }
      if (x.match(/(heating)|(heat)|(gas)/igm)) {
        console.log('HEATING')
        utilities.push('heating')
      }
    }
    if (x.match(/(air conditioning)|(ac)|(a\/c)/igm)) {
      console.log('AC')
      utilities.push('ac')
    }
    if (x.match(/(insurance)/igm)) {
      console.log('INSURANCE')
      utilities.push('insurance')
    }
    if (x.match(/(internet)|(wifi)/igm)) {
      console.log('INTERNET')
      utilities.push('internet')
    }
    console.log(utilities)
    console.log(text)
    return utilities.join(', ')
  } else {
    return 'none'
  }
}

exports.extract_movein = function(text) {
  if (text) {
    const chars = text.replace(/[\t\n\r]/gmi,' ').trim().split(' ')
    let movein_loc
    let movein_date
    chars.forEach((char, index) => {
      const x = char.match(/(movein)|(move-in)|(available)|(availability)|(start)/gmi)
      if (x) {
        movein_loc = index
      }
    })
    if (movein_loc > -1) {
      const pre = chars.slice(Math.max(movein_loc-6, 0), movein_loc).join(' ')
      const post = chars.slice(movein_loc, Math.max(movein_loc+6, chars.length-1)).join(' ')
      // testing for preceding positives
      if (pre) {
        movein_date = chrono.parseDate(pre)
      }
      // testing for postceding positives
      if (post) {
        movein_date = chrono.parseDate(post)
      }
    }
    return movein_date
  } else {
    return moment().toISOString()
  }
}

exports.extract_sqft = function(text) {
  if (text) {
    const x = text.replace(/[\t\n\r]/gm,' ').trim()
    let sqft = 0
    if (x.match(/(\d+)\s?(sqft|square feet|ft²|sq-ft|sq\.ft)/gmi)) {
      const size_str = x.match(/(\d+)\s?(sqft|square feet|ft²|sq-ft|sq\.ft)/gmi).join(' ')
      const a = size_str.match(/(\d+)/gmi)
      if (a) {
        sqft = a[0]
      } else {
        sqft = 0
      }
    }
    return parseInt(sqft)
  } else {
    return 0
  }
}

exports.extract_parking = function(text) {
  if (text) {
    const x = text.replace(/[\t\n\r]/gm,' ').trim()
    let parking = false
    if (x.match(/(parking)/gmi) && x.match(/(available)|(included)|(extra)/gmi)) {
      parking = true
    }
    if (x.match(/(parking)/gmi) && x.match(/(no)|(not)/gmi)) {
      parking = false
    }
    return parking
  } else {
    return false
  }
}

exports.extract_mls = function(text) {
  if (text) {
    const x = text.replace(/[\t\n\r]/gm,' ').trim()
    let mls_num = 'private_listing'
    if (x.match(/(mls)|(not intended to solicit)/gmi) && x.match(/(mls){1}\s?\®?\#?\s?(\w\d+)/gmi)) {
      const a = x.match(/(mls){1}\s?\®?\#?\s?(\w\d+)/gmi)
      if (a) {
        mls_num = a[0]
      } else {
        mls_num = 'unknown_mls'
      }
    } else {
      mls_num = 'private_listing'
    }
    return mls_num
  } else {
    return 'private_listing'
  }
}

exports.extract_duration = function(text) {
  if (text) {
    const x = text.replace(/[\t\n\r]/gm,' ').trim()
    let lease_length = 12
    const possible_lengths = x.match(/(\d+\s)(month|year)\s?(lease|duration|contract)?/gmi)
    if (possible_lengths) {
      const est_length = possible_lengths[0].match(/\d+/igm)
      if (est_length) {
        lease_length = parseInt(est_length)
      }
    }
    console.log(lease_length)
    return lease_length
  } else {
    return 12
  }
}

exports.extract_brokerage = function(text) {
  if (text) {
    const found_brokerage_mentions = text.match(/(remax)|(re\/max)|(realty)|(brokerage)|(sutton)|(century)|(keller)|(coldwell)/gmi)
    if (found_brokerage_mentions) {
      return 'unknown_mls'
    } else {
      return 'private_listing'
    }
  }
}
