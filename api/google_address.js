// const fs = require('fs')
// const Rx = require('rxjs')
// const axios = require('axios')
// const moment = require('moment')
// const language = require('@google-cloud/language');
// const PROJECT_ID = require('../credentials/' + process.env.NODE_ENV + '/ai-sandbox-creds.json').PROJECT_ID
// const API_KEY = require('../credentials/' + process.env.NODE_ENV + '/ai-sandbox-api-key.json').key
// const PROJECT_CREDS_PATH = __dirname + '/../credentials/' + process.env.NODE_ENV + '/ai-sandbox-creds.json'
// const PROJECT_CREDS = require(PROJECT_CREDS_PATH)
//
// // test with $ NODE_ENV=development node parsing/sentiment/analyze_reviews.js
//
// console.log('\n\n\n\n')
// console.log('Starting script...')
// console.log('\n\n')
//
// const YELP_REVIEWS_JSON = require('../../scraping/yelp/pm_data/pages/yelp_reviews_8.json').filter((yelp) => {
//   return yelp.name && yelp.streetAddress
// })
// // console.log(YELP_REVIEWS_JSON.slice(0,10))
// // console.log(YELP_REVIEWS_JSON.length)
// // [0, 10]
// // console.log(YELP_REVIEWS_JSON.length)
// // console.log(YELP_REVIEWS_JSON.map(y => y.name))
//
// exports.analyze_reviews = function() {
//   const p = new Promise((res, rej) => {
//     let Items = []
//     const onNext = ({ obs, index }) => {
//       setTimeout(() => {
//         console.log('OBSERVABLE NEXT -- ', index)
//         const COMPANY = YELP_REVIEWS_JSON[index]
//         console.log(COMPANY.name)
//         analyze_company(COMPANY)
//           .then((data) => {
//             console.log('Analyzed company')
//             if (index + 1 >= YELP_REVIEWS_JSON.length) {
//               obs.complete('Done all company reviews!')
//             } else {
//               obs.next({
//                 obs,
//                 index: index + 1
//               })
//             }
//           })
//           .catch((err) => {
//             if (index + 1 >= YELP_REVIEWS_JSON.length) {
//               obs.complete('Done all company reviews!')
//             } else {
//               obs.next({
//                 obs,
//                 index: index + 1
//               })
//             }
//           })
//       }, 1000)
//     }
//     Rx.Observable.create((obs) => {
//       obs.next({
//         obs,
//         index: 0
//       })
//     }).subscribe({
//       next: onNext,
//       error: (err) => {
//         console.log('OBSERVABLE ERROR')
//         console.log(err)
//       },
//       complete: (y) => {
//         console.log('OBSERVABLE COMPLETE')
//         res(Items)
//       }
//     })
//   })
//   return p
// }
//
// const googleMapsClient = require('@google/maps').createClient({
//   key: API_KEY
// })
//
// const analyze_company = (COMPANY) => {
//   const p = new Promise((res_dammit, rej_dammit) => {
//     console.log('\n\n')
//     console.log(`- Loaded company: ${COMPANY.name}`)
//     console.log(`- Average Rating: ${COMPANY.ratingValue}`)
//     console.log(`- # of Ratings: ${COMPANY.reviewCount}`)
//     console.log('\n\n')
//
//     let company_promise = new Promise((res, rej) => {
//       if (COMPANY.streetAddress) {
//         const business_name = COMPANY.name.trim()
//         const business_address = `${COMPANY.streetAddress}, ${COMPANY.addressLocality} ${COMPANY.addressRegion}`
//         console.log('Getting Google Places for ', business_name)
//         googleMapsClient.geocode({
//           address: business_name
//         }, function(err, response) {
//           if (err) {
//             console.log('Encountered error');
//             console.log(err);
//             company_promise = Promise.reject(err)
//           } else {
//             console.log('Got a response back')
//             const results = response.json.results
//             console.log(results)
//             if (results.length > 0) {
//               console.log(response.json.results[0].formatted_address)
//               COMPANY.gps = results[0].geometry.location
//               COMPANY.place_id = results[0].place_id
//               axios.get(`https://maps.googleapis.com/maps/api/place/details/json?key=${API_KEY}&placeid=${results[0].place_id}&fields=rating,review`)
//                 .then((data) => {
//                   const google_reviews = data.data.result.reviews
//                   let all_reviews = COMPANY.reviews.map((rev) => {
//                     rev.date = moment(rev.date, 'MM/DD/YYYY').unix()
//                     rev.rating = null
//                     rev.source = 'yelp'
//                     return rev
//                   })
//                   if (google_reviews && google_reviews.length > 0) {
//                     all_reviews = all_reviews.concat(
//                       google_reviews.map((rev) => {
//                         let g_rev = {}
//                         g_rev.source = 'google'
//                         g_rev.date = rev.time * 1000
//                         g_rev.name = rev.author_name
//                         g_rev.pic = rev.author_url
//                         g_rev.rating = rev.rating
//                         g_rev.text = rev.text
//                         return g_rev
//                       })
//                     )
//                     console.log(`Found ${google_reviews.length} reviews from Google`)
//                   }
//                   COMPANY.reviews = all_reviews
//                   res(COMPANY)
//                 })
//                 .catch((err) => {
//                   console.log(err);
//                   rej(err)
//                 })
//             } else {
//               console.log('No Google Geo-Coding results found!')
//               res(COMPANY)
//             }
//           }
//         })
//       } else {
//         res(COMPANY)
//       }
//     })
//
//     company_promise.then((CMPY) => {
//       // Instantiates a client
//       const client = new language.LanguageServiceClient({
//         projectId: PROJECT_ID,
//         keyFilename: PROJECT_CREDS_PATH,
//       });
//
//       console.log('Detecting sentiment in reviews: \n')
//       const sentimental_reviews = CMPY.reviews.map((review) => {
//         const document = {
//           content: review.text,
//           type: 'PLAIN_TEXT',
//         };
//         // Detects the sentiment of the text
//         return client
//                 .analyzeSentiment({document: document})
//                 .then(results => {
//                   const sentiment = results[0].documentSentiment;
//
//                   console.log(`\n --------------------- \n`)
//                   console.log(`Text: ${review.text}`);
//                   console.log(`\n - Written by ${review.name} ${moment(review.date).fromNow()}`)
//                   console.log(`Sentiment score: ${sentiment.score}`);
//                   console.log(`Sentiment magnitude: ${sentiment.magnitude}`);
//                   console.log(`\n --------------------- \n`)
//                   let sentimental_review = review
//                   sentimental_review.sentiment_score = sentiment.score
//                   sentimental_review.sentiment_magnitude = sentiment.magnitude
//                   return Promise.resolve(sentimental_review)
//                 })
//                 .catch(err => {
//                   console.error('ERROR:', err);
//                   return Promise.reject(err)
//                 });
//       })
//       return Promise.all(sentimental_reviews)
//     }).then((new_reviews) => {
//       COMPANY.reviews = new_reviews
//       const NEW_COMPANY = JSON.stringify(COMPANY)
//       fs.writeFile(`${__dirname}/data/${COMPANY.name.replace(/(\s|\\|\/)/g, '_')}.json`, NEW_COMPANY, (err) => {
//         // throws an error, you could also catch it here
//         if (err) {
//           console.log(err)
//           rej_dammit(err)
//         } else {
//           // success case, the file was saved
//           console.log('Company reviews with sentiment saved!');
//           res_dammit()
//         }
//       });
//     }).catch((err) => {
//       console.log('\n\n\n =======> Could not grab all review sentiments. An error occurred. \n\n\n')
//       console.log(err)
//       rej_dammit(err)
//     })
//   })
//   return p
// }
//
// exports.analyze_reviews()
