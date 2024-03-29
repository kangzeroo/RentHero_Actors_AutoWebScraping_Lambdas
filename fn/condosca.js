const moment = require('moment')
// const PROJECT_ID = require('../credentials/' + process.env.NODE_ENV + '/ai-sandbox-creds.json').PROJECT_ID
const API_KEY = require('../credentials/' + process.env.NODE_ENV + '/ai-sandbox-api-key.json').key
const PROJECT_CREDS_PATH = __dirname + '/../credentials/' + process.env.NODE_ENV + '/ai-sandbox-creds.json'
const PROJECT_CREDS = require(PROJECT_CREDS_PATH)
const googleMapsClient = require('@google/maps').createClient({
  key: API_KEY
})
const WeakNLP = require('../api/nlp/weak_nlp')
const uuid = require('uuid')
const annotateImages = require('../api/automl/automl_vision').annotateImages
const backupImages = require('../api/s3/aws_s3').backupImages
const insertIntel = require('../DynamoDB/general_insertions').insertIntel
const query_dynamodb = require('../DynamoDB/general_queryable').query_dynamodb
const RENTAL_LISTINGS = require('../credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').RENTAL_LISTINGS
const insertAddressComponents = require('../api/rds/rds_api').insertAddressComponents

module.exports = function(event, context, callback) {

  console.log('------ condosca() ------')
  console.log('------ LAMBDA EVENT OBJECT ------')
  console.log(event)
  console.log(event.body)
  console.log(JSON.parse(event.body))
  const dirty_ad = JSON.parse(event.body)
  // dirty_ad = {}
    /*
        dirty_ad = { ad_url: 'https://condos.ca/toronto/the-ninety-90-broadview-ave/unit-401-E4275451',
  date_posted: '2018-10-12',
  poster_name: 'Broker: CHESTNUT PARK REAL ESTATE LIMITED, BROKERAGE',
  title: 'The Ninety,  Unit 401',
  sqft: '1000-1199 sqft',
  movein: 'Immediate',
  address: '90 Broadview Ave, Toronto',
  price: 'Rental Price $2,875',
  description: 'Loft Living At The Ninety. 1 Bedroom + Den. Over 1,000 Sqft W/Spacious Combined Living And Dining Area. Exposed Concrete, Stainless Steel Appliances, Ensuite Washer & Dryer And Gas Stove! Engineered Hardwood Floors, Walk-In Closet, Ensuite Bathroom. Steps To The Best Restaurants, Shops, Bars, Galleries, Ttc, Leslieville, Corktown, Distillery District. Heat Pump Rental $39.74.EXTRAS:Fridge, Stove, Dishwasher, Washer, Dryer, All Elfs, Window Coverings. Heat Pump Rental $39.74.\t\t\t\t\t\t\t\n\t\t\t\t\t\t\t\n\t\t\t\t\t\t\t\tBroker: CHESTNUT PARK REAL ESTATE LIMITED, BROKERAGE\n\t\t\t\t\t\t\t\t\n\t\t\t\t\t\t\t\t\t      MLS®# E4275451',
  images:
   [ 'https://condos.ca/public/condo_listing/9a/77/56/02/24fd177_3aa4.jpg',
     'https://condos.ca/public/condo_listing/9f/77/56/02/24fd17c_7a34.jpg',
     'https://condos.ca/public/condo_listing/a4/77/56/02/24fd181_53df.jpg',
     'https://condos.ca/public/condo_listing/a9/77/56/02/24fd186_af64.jpg',
     'https://condos.ca/public/condo_listing/ae/77/56/02/24fd18b_8241.jpg',
     'https://condos.ca/public/condo_listing/b3/77/56/02/24fd190_0c69.jpg',
     'https://condos.ca/public/condo_listing/b8/77/56/02/24fd195_3188.jpg',
     'https://condos.ca/public/condo_listing/bd/77/56/02/24fd19a_71f8.jpg',
     'https://condos.ca/public/condo_listing/c2/77/56/02/24fd19f_612c.jpg',
     'https://condos.ca/public/condo_listing/c7/77/56/02/24fd1a4_a08d.jpg',
     'https://condos.ca/public/condo_listing/cc/77/56/02/24fd1a9_c3f5.jpg',
     'https://condos.ca/public/condo_listing/d1/77/56/02/24fd1ae_8c8f.jpg' ],
  mls_num: 'MLS®# E4275451',
  beds: 'Beds 1',
  baths: 'Bath 2',
  section_amenities: 'Common Rooftop Deck Concierge Public Transit Party Room Visitor Parking BBQs Outdoor Patio / Garden Parking Garage Pet Restrictions Games / Recreation Room Security Guard Enter Phone System',
  section_utils: 'Air Conditioning Common Element Maintenance Heat Building Insurance Water' }
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
            address: checkCityAddress(dirty_ad.address, dirty_ad.ad_url)
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
    cleaned_ad.BEDS = WeakNLP.extract_beds(dirty_ad.beds) || 0
    cleaned_ad.BATHS = WeakNLP.extract_baths(dirty_ad.baths) || 0
    cleaned_ad.FURNISHED = WeakNLP.extract_furnished(dirty_ad.description) || false
    cleaned_ad.UTILITIES = WeakNLP.extract_utils(dirty_ad.section_utils) || 'none'
    cleaned_ad.MOVEIN = WeakNLP.extract_movein(`${dirty_ad.description} ${dirty_ad.movein}`) || moment().toISOString()
    if (isEmpty(cleaned_ad.MOVEIN)) {
      cleaned_ad.MOVEIN = moment().toISOString()
    }
    cleaned_ad.SQFT = WeakNLP.extract_sqft(`${dirty_ad.description} ${dirty_ad.sqft}`) || 0
    cleaned_ad.PARKING = WeakNLP.extract_parking(`${dirty_ad.description} ${dirty_ad.section_amenities}`) || false
    cleaned_ad.MLS = WeakNLP.extract_mls(`${dirty_ad.description} ${dirty_ad.mls_num}`) || 'private_listing'
    cleaned_ad.LEASE_LENGTH = WeakNLP.extract_duration(dirty_ad.description) || 12
    cleaned_ad.SELLER = dirty_ad.poster_name || 'Private Landlord'
    cleaned_ad.TITLE = dirty_ad.title || cleaned_ad.address
    cleaned_ad.DESCRIPTION = dirty_ad.description || 'For Rent'
    cleaned_ad.DATE_POSTED = moment(dirty_ad.date_posted, 'YYYY-MM-DD').toISOString() || moment().toISOString()
    cleaned_ad.DATE_POSTED_UNIX = moment(dirty_ad.date_posted, 'YYYY-MM-DD').unix() || moment().unix()
    cleaned_ad.ITEM_ID = encodeURIComponent(dirty_ad.ad_url)
    cleaned_ad.REFERENCE_ID = uuid.v4()
    cleaned_ad.SOURCE = 'condos.ca'
    cleaned_ad.SCRAPED_AT = moment().toISOString()
    cleaned_ad.SCRAPED_AT_UNIX = moment().unix()
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
