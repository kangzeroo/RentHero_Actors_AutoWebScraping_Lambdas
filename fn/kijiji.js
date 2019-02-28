const moment = require('moment')
const PROJECT_ID = require('../credentials/' + process.env.NODE_ENV + '/ai-sandbox-creds.json').PROJECT_ID
const API_KEY = require('../credentials/' + process.env.NODE_ENV + '/ai-sandbox-api-key.json').key
const PROJECT_CREDS_PATH = __dirname + '/../credentials/' + process.env.NODE_ENV + '/ai-sandbox-creds.json'
const PROJECT_CREDS = require(PROJECT_CREDS_PATH)
console.log(API_KEY)
const gmaps = require('@google/maps')
const googleMapsClient = gmaps.createClient({
  key: API_KEY
})
const WeakNLP = require('../api/nlp/weak_nlp')
const uuid = require('uuid')
const ShortUniqueId = require('short-unique-id')
const annotateImages = require('../api/automl/automl_vision').annotateImages
const backupImages = require('../api/s3/aws_s3').backupImages
const insertIntel = require('../DynamoDB/general_insertions').insertIntel
const query_dynamodb = require('../DynamoDB/general_queryable').query_dynamodb
const RENTAL_LISTINGS = require('../credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').RENTAL_LISTINGS
const insertAddressComponents = require('../api/rds/rds_api').insertAddressComponents

module.exports = function(event, context, callback) {

  console.log('------ kijiji() ------')
  console.log('------ LAMBDA EVENT OBJECT ------')
  console.log(event)
  console.log(event.body)
  console.log(JSON.parse(event.body))
  const dirty_ad = JSON.parse(event.body)
  // dirty_ad = {}
    /*
        dirty_ad = { ad_url: 'https://www.kijiji.ca/v-1-bedroom-apartments-condos/city-of-toronto/318-richmond-st-806/1397141511?enableSearchNavigationFlag=true',
  ad_id: 'Ad ID 1397141511',
  date_posted: 'November 12, 2018 6:35 AM',
  poster_name: 'AGGASH',
  title: 'Downtown Condo in Entertainment District 1 Bedroom ',
  address: '318 Richmond St W, Toronto, ON M5V 0B4, Canada',
  price: '$2,100.00',
  details:
   [ 'Bathrooms (#)1 bathroom',
     'Bedrooms (#)1 bedroom',
     'FurnishedNo',
     'Pet FriendlyNo' ],
  description: 'Luxurious Picasso Condo In The Heart Of The Entertainment District. Walk To Vibrant King & Queen St W, C.N Tower , Roger Centre, Air Canada Centre & Financial District. Mins Walk To Restaurant, Ttc, Harbour Front, Ripley\'s Aquarium. 24 Hours Concierge, Yoga & Pilates Studio, Billiards Room, Spa, Media Room, Sauna, Exercise Room.\nFridge, Cook Top With Built-In Oven/Microwave, B/I Dishwasher, Washer/Dryer. No Pets Or Smokers. Note: Hydro To Be Paid By Tenant.',
  images:
   [ 'https://i.ebayimg.com/00/s/NjQwWDQ4MA==/z/KucAAOSwpwRb6R7v/$_59.JPG',
     'https://i.ebayimg.com/00/s/NjQwWDY0MA==/z/nnMAAOSwHSdb6R7g/$_59.JPG',
     'https://i.ebayimg.com/00/s/NjQwWDY0MA==/z/rnEAAOSwHORb6R72/$_59.JPG',
     'https://i.ebayimg.com/00/s/NjQwWDY0MA==/z/p5AAAOSwcnJb6R79/$_59.JPG',
     'https://i.ebayimg.com/00/s/NDY0WDY0MA==/z/V3gAAOSw-pNb6R7o/$_59.JPG' ],
  phone: '' }
    */
  console.log('------ LAMBDA CONTEXT OBJECT ------')
  console.log(context)

  // start making the clean ad
  let cleaned_ad = {
    ADDRESS: '',
    GPS: {},
    PLACE_ID: ''
  }

  const p = new Promise((res, rej) => {
    const params = {
      "TableName": RENTAL_LISTINGS,
      "KeyConditionExpression": "#ITEM_ID = :item_id",
      "IndexName": "By_Item_ID",
      "ExpressionAttributeNames": {
        "#ITEM_ID": "ITEM_ID",
      },
      "ExpressionAttributeValues": {
        ":item_id": encodeURIComponent(dirty_ad.ad_url),
      }
    }
    query_dynamodb(params)
      .then((Items) => {
        console.log('CHECKED IF ALREADY EXISTS...')
        console.log(Items)
        if (Items.length === 0 && dirty_ad.address) {
            googleMapsClient.geocode({
              address: dirty_ad.address
            }, function(err, response) {
              if (err) {
                console.log('Encountered error');
                console.log(err);
                rej(err)
              } else {
                const results = response.json.results
                console.log(results[0])
                console.log(results[0].address_components)
                console.log(results[0].formatted_address)
                console.log(results[0].geometry.location)
                console.log(results[0].place_id)
                if (results.length > 0) {
                  insertAddressComponents(results[0].address_components, results[0].formatted_address, results[0].geometry.location, results[0].place_id)
                    .then((addressResults) => {
                      cleaned_ad.ADDRESS = results[0].formatted_address
                      cleaned_ad.GPS = results[0].geometry.location
                      cleaned_ad.GEO_POINT = `${results[0].geometry.location.lat},${results[0].geometry.location.lng}`
                      cleaned_ad.PLACE_ID = results[0].place_id
                      cleaned_ad.ADDRESS_ID = addressResults.address_id
                      console.log('Cleaned_ad: ', cleaned_ad)
                      res({
                        exists: false,
                        cleaned_ad
                      })
                    })
                    .catch((err) => {
                      console.log('ERROR: ', err)
                      cleaned_ad.ADDRESS = results[0].formatted_address
                      cleaned_ad.GPS = results[0].geometry.location
                      cleaned_ad.GEO_POINT = `${results[0].geometry.location.lat},${results[0].geometry.location.lng}`
                      cleaned_ad.PLACE_ID = results[0].place_id
                      console.log(cleaned_ad)
                      rej(err)
                    })
                } else {
                  rej('No address results found')
                }
              }
            })
        } else {
          res({
            exists: true,
          })
        }
      })
  })

  p.then((result) => {
    if (result.exists) {
      console.log('This ad already exists!')
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Ad already exists',
          data: cleaned_ad,
        }),
      }
      callback(null, response)
    } else {
      console.log('Done the geo-querying!')
      return backupImages(dirty_ad.images)
    }
  })
  .then((backedup_images) => {
    return annotateImages(backedup_images)
  })
  .then((annotated_images) => {
    cleaned_ad.IMAGES = annotated_images
    console.log('Done the image backups!')
    return extractDetails(cleaned_ad, dirty_ad)
  })
  .then((final_ad) => {
    console.log(final_ad)
    cleaned_ad = final_ad
    console.log('Done the extraction!')
    return insertIntel(final_ad, RENTAL_LISTINGS)
  })
  .then(() => {
    console.log('Saved the rental listings to DynamoDB!')
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully parsed Condos.ca ad into clean RentHero ad',
        data: cleaned_ad,
      }),
    };
    callback(null, response);
  })
  .catch((err) => {
    console.log(err)
    callback(err)
  })

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
}


const extractDetails = function(cleaned_ad, dirty_ad) {
  const p = new Promise((res, rej) => {
    cleaned_ad.URL = dirty_ad.ad_url
    cleaned_ad.PRICE = WeakNLP.extract_price(dirty_ad.price) || 0
    cleaned_ad.BEDS = WeakNLP.extract_beds(dirty_ad.details.filter(d => d.toLowerCase().indexOf('bed') > -1)[0]) || 0
    cleaned_ad.BATHS = WeakNLP.extract_baths(dirty_ad.details.filter(d => d.toLowerCase().indexOf('bath') > -1)[0]) || 0
    cleaned_ad.FURNISHED = WeakNLP.extract_furnished(`${dirty_ad.description} ${dirty_ad.details.filter(d => d.toLowerCase().indexOf('furnished') > -1)[0]}`) || false
    cleaned_ad.UTILITIES = WeakNLP.extract_utils(dirty_ad.description) || 'none'
    cleaned_ad.MOVEIN = WeakNLP.extract_movein(dirty_ad.description) || moment().toISOString()
    if (isEmpty(cleaned_ad.MOVEIN)) {
      cleaned_ad.MOVEIN = moment().toISOString()
    }
    cleaned_ad.SQFT = WeakNLP.extract_sqft(dirty_ad.description) || 0
    cleaned_ad.PARKING = WeakNLP.extract_parking(dirty_ad.description) || false
    cleaned_ad.MLS = WeakNLP.extract_mls(dirty_ad.description) || 'private_listing'
    cleaned_ad.LEASE_LENGTH = WeakNLP.extract_duration(dirty_ad.description) || 12
    cleaned_ad.SELLER = dirty_ad.poster_name || 'Private Landlord'
    cleaned_ad.TITLE = dirty_ad.title || cleaned_ad.address
    cleaned_ad.DESCRIPTION = dirty_ad.description || 'For Rent'
    cleaned_ad.DATE_POSTED = moment(dirty_ad.date_posted, 'MMMM DD, YYYY').toISOString() || moment().toISOString()
    cleaned_ad.DATE_POSTED_UNIX = moment(dirty_ad.date_posted, 'MMMM DD, YYYY').unix() || moment().unix()
    cleaned_ad.ITEM_ID = encodeURIComponent(dirty_ad.ad_url)
    cleaned_ad.REFERENCE_ID = uuid.v4()
    cleaned_ad.SOURCE = 'kijiji'
    cleaned_ad.PHONE = dirty_ad.phone || 'none'
    cleaned_ad.SCRAPED_AT = moment().toISOString()
    cleaned_ad.SCRAPED_AT_UNIX = moment().unix()
    const uid = new ShortUniqueId()
    cleaned_ad.SHORT_ID = uid.randomUUID(8)
    if (dirty_ad.ad_url.indexOf('room-rental-roommate') > -1) {
      cleaned_ad.BEDS = 1
    }
    res(cleaned_ad)
  })
  return p
}

const checkCityAddress = function(address, url) {
  let rightAddress = address + ' Canada'
  if (url.toLowerCase().indexOf('toronto') > -1) {
    if (address.toLowerCase().indexOf('toronto') === -1) {
      rightAddress = address + ', Toronto Canada'
    }
  }
  if (url.toLowerCase().indexOf('waterloo') > -1) {
    if (address.toLowerCase().indexOf('waterloo') === -1) {
      rightAddress = address + ', Waterloo Canada'
    }
  }
  return rightAddress
}

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}
