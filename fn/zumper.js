const moment = require('moment')
const PROJECT_ID = require('../credentials/' + process.env.NODE_ENV + '/ai-sandbox-creds.json').PROJECT_ID
const API_KEY = require('../credentials/' + process.env.NODE_ENV + '/ai-sandbox-api-key.json').key
const PROJECT_CREDS_PATH = __dirname + '/../credentials/' + process.env.NODE_ENV + '/ai-sandbox-creds.json'
const PROJECT_CREDS = require(PROJECT_CREDS_PATH)
const googleMapsClient = require('@google/maps').createClient({
  key: API_KEY
})
const WeakNLP = require('../api/nlp/weak_nlp')
const annotateImages = require('../api/automl/automl_vision').annotateImages
const backupImages = require('../api/s3/aws_s3').backupImages
const insertIntel = require('../DynamoDB/general_insertions').insertIntel
const query_dynamodb = require('../DynamoDB/general_queryable').query_dynamodb
const uuid = require('uuid')
const ShortUniqueId = require('short-unique-id')
const RENTAL_LISTINGS = require('../credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').RENTAL_LISTINGS
const insertAddressComponents = require('../api/rds/rds_api').insertAddressComponents

module.exports = function(event, context, callback) {

  console.log('------ zumper() ------')
  console.log('------ LAMBDA EVENT OBJECT ------')
  console.log(event)
  console.log(event.body)
  console.log(JSON.parse(event.body))
  const dirty_ad = JSON.parse(event.body)

    /*
        dirty_ad = {
            ad_url: 'https://www.zumper.com/apartments-for-rent/33810577/1-bedroom-the-village-toronto-on',
            images:
             [ 'https://d37lj287rvypnj.cloudfront.net/254942037/1280x960',
               'https://d37lj287rvypnj.cloudfront.net/259228518/1280x960' ],
           address: '42 Charles Street East #3102, Toronto ON',
           contact: 'Andrew Masters (RE/MAX URBAN TORONTO 416 856 4234)',
           price: '$2,500',
            descs:
             [
                '1 Bed 2 Bathrooms 550 ft² No pets 51 Minutes Ago',

               '$2200 / 1br - 550ft2 - NEW 42 CHARLES ST E #3102, 1 BED, 2 BATHS, WRAP-AROUND BALCONY, DOWNTOWN TORONTO (Bloor/Yonge) Stunning Luxurious Casa 2 one bed Condo At Yonge/Bloor! Perfect Location In The Yorkville Neighbourhood. Amazing View From Southeast Corner Unit With Spacious Wrap-Around Balcony, 9" Ceilings, Floor To Ceiling Windows, Designer Kitchens With European Appliances, Marble Countertop In Both Washroom. Excellent Facilities. 24-Hour Concierge. Infinity Pool, Near 2 Subway Lines! Walking Distance From U Of T, Fine Dining & Entertainment District And Much More! Includes:Fridge, Stove, Hood/Microwave, Washer/Dryer, Dishwasher, All Existing Lighting Fixtures and Window Coverings.  High floor with amazing views! Condos Designed By Award-Winning Architects. Steps To Subway and Bloor Street/Yonge Street Shopping, Restaurants, Most convenient location, close to everything!! 20Ft Lobby, State Of The Art Amenities Including Fully Equipped Gym, Rooftop Lounge,Outdoor Infinity Pool, 24 hours Concierge and much more!  Ready to move in immediately!  Contact : Narayan T.O. Condos Realty Inc. Cell: 647 537 5752 Lease Terms Minimum One Year Available Now',

               'Apartment Contact Narayan (T.O. Condos Realty Inc.) Phone: (647) 537-5752',

               'UNIT Air Conditioning Balcony Central Heat Dishwasher Hardwood Floor High Ceilings In Unit Laundry',

               'BUILDING Business Center Concierge Service Elevator Fitness Center Garage Parking Onsite Management Outdoor Space Package Service Residents Lounge Roof Deck Secured Entry Storage Swimming Pool'
            ],
       }
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
        if (Items.length === 0) {
          googleMapsClient.geocode({
              address: dirty_ad.address
            }, function(err, response) {
              if (err) {
                console.log('Encountered error');
                console.log(err);
                rej(err)
              } else {
                const results = response.json.results
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
      .catch((err) => {
        console.log(err)
        rej(err)
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
    cleaned_ad.BEDS = WeakNLP.extract_beds(dirty_ad.descs.slice(0,1).join('. ')) || 0
    cleaned_ad.BATHS = WeakNLP.extract_baths(dirty_ad.descs.slice(0,1).join('. ')) || 0
    cleaned_ad.FURNISHED = WeakNLP.extract_furnished(dirty_ad.descs.join('. ')) || false
    cleaned_ad.UTILITIES = WeakNLP.extract_utils(dirty_ad.descs.join('. ')) || 'none'
    cleaned_ad.MOVEIN = WeakNLP.extract_movein(dirty_ad.descs.join('. ')) || moment().toISOString()
    if (isEmpty(cleaned_ad.MOVEIN)) {
      cleaned_ad.MOVEIN = moment().toISOString()
    }
    cleaned_ad.SQFT = WeakNLP.extract_sqft(dirty_ad.descs.join('. ')) || 0
    cleaned_ad.PARKING = WeakNLP.extract_parking(dirty_ad.descs.join('. ')) || false
    cleaned_ad.MLS = WeakNLP.extract_brokerage(dirty_ad.descs.join('. ')) || 'private_listing'
    cleaned_ad.LEASE_LENGTH = WeakNLP.extract_duration(dirty_ad.descs.join('. ')) || 12
    cleaned_ad.SELLER = dirty_ad.contact || 'Private Landlord'
    cleaned_ad.TITLE = cleaned_ad.ADDRESS
    cleaned_ad.DESCRIPTION = dirty_ad.descs.join('. ') || 'For Rent'
    cleaned_ad.DATE_POSTED = moment().toISOString()
    cleaned_ad.DATE_POSTED_UNIX = moment().unix()
    cleaned_ad.ITEM_ID = encodeURIComponent(dirty_ad.ad_url)
    cleaned_ad.REFERENCE_ID = uuid.v4()
    const uid = new ShortUniqueId()
    cleaned_ad.SHORT_ID = uid.randomUUID(8)
    cleaned_ad.SOURCE = 'zumper'
    cleaned_ad.SCRAPED_AT = moment().toISOString()
    cleaned_ad.SCRAPED_AT_UNIX = moment().unix()
    res(cleaned_ad)
  })
  return p
}

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}
