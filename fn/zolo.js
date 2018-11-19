const moment = require('moment')
const PROJECT_ID = require('../credentials/' + process.env.NODE_ENV + '/ai-sandbox-creds.json').PROJECT_ID
const API_KEY = require('../credentials/' + process.env.NODE_ENV + '/ai-sandbox-api-key.json').key
const PROJECT_CREDS_PATH = __dirname + '/../credentials/' + process.env.NODE_ENV + '/ai-sandbox-creds.json'
const PROJECT_CREDS = require(PROJECT_CREDS_PATH)
const googleMapsClient = require('@google/maps').createClient({
  key: API_KEY
})
const WeakNLP = require('../api/nlp/weak_nlp')
const backupImages = require('../api/s3/aws_s3').backupImages
const insertIntel = require('../DynamoDB/general_insertions').insertIntel
const uuid = require('uuid')
const RENTAL_LISTINGS = require('../credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').RENTAL_LISTINGS

module.exports = function(event, context, callback) {

  console.log('------ zolo() ------')
  console.log('------ LAMBDA EVENT OBJECT ------')
  console.log(event)
  console.log(event.body)
  console.log(JSON.parse(event.body))
  const dirty_ad = JSON.parse(event.body)

  // data = {}
    /*
        data = { ad_url: 'https://www.zolo.ca/toronto-real-estate/31-bales-avenue/911',
  date_posted: 'Nov 13, 2018',
  poster_name: 'Royal Lepage Terrequity Elite Realty, Brokerage',
  title: '911 - 31 Bales Avenue',
  address: '911 - 31 Bales Avenue Toronto',
  price: '$2,650 ',
  description: 'This condo apt home located at 31 Bales Avenue, Toronto is currently for rent and has been available on Zolo.ca for 1 day. It has 2 beds, 2 bathrooms, and is 800-899 square feet. 31 Bales Avenue, Toronto is in the Willowdale East neighborhood Toronto. Lansing Westgate, Newtonbrook East and Willowdale West are nearby neighborhoods. ',
  images:
   [ 'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-1.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-1.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-10.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-11.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-12.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-13.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-14.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-15.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-16.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-2.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-3.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-4.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-5.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-6.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-7.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-8.jpg?2018-11-14+10%3A18%3A30',
     'https://photos.zolo.ca/911-31-bales-avenue-toronto-c4302100-photo-9.jpg?2018-11-14+10%3A18%3A30' ],
  mls_num: 'MLS# C4302100',
  unit_style: 'Condo Apt Apartment',
  beds: '2 Bed',
  baths: '2 Bath',
  pets: 'Restrict',
  section_parking: 'Garage Undergrnd  Parking Places 1  Covered Parking Places 1',
  section_property: 'Type Condo Apt  Style Apartment  Size (sq ft) 800-899  Property Type Residential  Area Toronto  Community Willowdale East  Availability Date 12/15/18',
  section_fees: 'Building Insurance Included Yes  Common Elements Included Yes  Parking Included Yes',
  section_inside: 'Bedrooms 2  Bathrooms 2  Kitchens 1  Rooms 5  Patio Terrace Open  Air Conditioning Central Air',
  section_building: 'Pets Restrict  Stories 9  Heating Forced Air  Private Entrance Yes',
  section_rental: 'Furnished N',
  section_land: 'Fronting On Se  Cross Street Yonge/Sheppard  Municipality District Toronto C14',
  section_rooms: 'Rooms Room details for 911 - 31 Bales Avenue: size, flooring, features etc.       Living Flat   10 x 15 151 sqft  Combined W/Dining, South View, W/O To Balcony   Dining Flat   10 x 8 75 sqft  Combined W/Living   Kitchen Flat   8 x 13 97 sqft  Eat-In Kitchen   Master Flat   15 x 12 183 sqft  W/I Closet   2nd Br Flat   10 x 13 129 sqft' }
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
          cleaned_ad.ADDRESS = results[0].formatted_address
          cleaned_ad.GPS = results[0].geometry.location
          cleaned_ad.PLACE_ID = results[0].place_id
          console.log(cleaned_ad)
          res(cleaned_ad)
        } else {
          rej('No address results found')
        }
      }
    })
  })

  p.then(() => {
    console.log('Done the geo-querying!')
    return backupImages(dirty_ad.images)
  })
  .then((backedup_images) => {
    cleaned_ad.IMAGES = backedup_images
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
    cleaned_ad.FURNISHED = WeakNLP.extract_furnished(`${dirty_ad.description} ${dirty_ad.section_rental}`) || false
    cleaned_ad.UTILITIES = WeakNLP.extract_utils(`${dirty_ad.description} ${dirty_ad.section_fees}`) || []
    cleaned_ad.MOVEIN = WeakNLP.extract_movein(`${dirty_ad.description} ${dirty_ad.section_fees}`) || moment().toISOString()
    cleaned_ad.SQFT = WeakNLP.extract_sqft(`${dirty_ad.description}`) || 0
    cleaned_ad.PARKING = WeakNLP.extract_parking(`${dirty_ad.description} ${dirty_ad.section_parking}`) || false
    cleaned_ad.MLS = WeakNLP.extract_mls(`${dirty_ad.description} ${dirty_ad.mls_num}`) || 'private_listing'
    cleaned_ad.SELLER = dirty_ad.poster_name || 'Private Landlord'
    cleaned_ad.TITLE = dirty_ad.title || cleaned_ad.address
    cleaned_ad.DESCRIPTION = dirty_ad.description || 'For Rent'
    cleaned_ad.DATE_POSTED = moment(dirty_ad.date_posted, 'MMM DD, YYYY').toISOString() || moment().toISOString()
    cleaned_ad.DATE_POSTED_UNIX = moment(dirty_ad.date_posted, 'MMM DD, YYYY').unix() || moment().unix()
    cleaned_ad.ITEM_ID = encodeURIComponent(dirty_ad.ad_url)
    cleaned_ad.SOURCE = 'zolo'
    res(cleaned_ad)
  })
  return p
}
