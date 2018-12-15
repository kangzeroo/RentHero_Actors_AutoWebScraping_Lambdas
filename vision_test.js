// const AUTOML_PROJECT_ID = require('./credentials/' + process.env.NODE_ENV + '/ai-automl-creds.json').project_id
// const vision = require('@google-cloud/vision');
const axios = require('axios')
const VISION_SERVER_KEY = require('./credentials/' + process.env.NODE_ENV + '/ai-automl-vision-key.json').key
//
// const visionML = new vision.ImageAnnotatorClient({
//   projectId: AUTOML_PROJECT_ID,
//   keyFilename: './credentials/' + process.env.NODE_ENV + '/ai-automl-creds.json'
// })
//
// visionML.labelDetection('https://online-listing-images-prod.s3.amazonaws.com/a4137983-afa9-4651-a60b-c9cfcb7dd011.png')
//             .then(results => {
//               const labels = results[0].labelAnnotations;
//
//               console.log('Labels:');
//               labels.forEach(label => console.log(label.description));
//             })
//             .catch(err => {
//               console.error('ERROR:', err);
//             });

const img_urls = [
  {
    image: {
      source: {
        imageUri: 'https://online-listing-images-prod.s3.amazonaws.com/a4137983-afa9-4651-a60b-c9cfcb7dd011.png'
      }
    },
    features: [
      { type: 'LABEL_DETECTION' },
      { type: 'IMAGE_PROPERTIES' },
      { type: 'CROP_HINTS' },
    ]
  },
  {
    image: {
      source: {
        imageUri: 'https://online-listing-images-prod.s3.amazonaws.com/84492e8b-d305-4b62-814c-128728ab6d2f.png'
      }
    },
    features: [
      { type: 'LABEL_DETECTION' },
      { type: 'IMAGE_PROPERTIES' },
      { type: 'CROP_HINTS' },
    ]
  }
]
axios.post(`https://vision.googleapis.com/v1/images:annotate?alt=json&key=${VISION_SERVER_KEY}`, {
  requests: img_urls
}).then((data) => {
  // console.log(data.data.responses)
  const doneObj = data.data.responses.map((result, i) => {
    return Object.assign(result, { url: img_urls[i] })
  })
  console.log(doneObj[0])
  return Promise.resolve(doneObj)
}).catch((err) => {
  return Promise.reject(err)
})


// NODE_ENV=development node vision_test.js
