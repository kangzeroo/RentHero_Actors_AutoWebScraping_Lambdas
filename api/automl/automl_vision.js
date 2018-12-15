const VISION_SERVER_KEY = require('../../credentials/' + process.env.NODE_ENV + '/ai-automl-vision-key.json').key
// const vision = require('@google-cloud/vision');
const axios = require('axios')
//
// const visionML = new vision.ImageAnnotatorClient({
//   projectId: AUTOML_PROJECT_ID,
//   keyFilename: '../../credentials/' + process.env.NODE_ENV + '/ai-automl-creds.json'
// })




// exports.annotateImages = function(img_urls) {
//   const annotated_images = img_urls.map((url) => {
//     return visionML.labelDetection('https://online-listing-images-prod.s3.amazonaws.com/a4137983-afa9-4651-a60b-c9cfcb7dd011.png')
//                 .then(results => {
//                   const labels = results[0].labelAnnotations;
//                   console.log('Labels:');
//                   labels.forEach(label => console.log(label.description));
//                   return Promise.resolve({
//                     url: url,
//                     caption: labels.map(lb => lb.description).join(', ')
//                   })
//                 })
//                 .catch(err => {
//                   console.error('ERROR:', err);
//                   return Promise.reject(err)
//                 });
//   })
//   return Promise.all(annotated_images)
// }

function chunkArray(myArray, chunk_size){
    var index = 0;
    var arrayLength = myArray.length;
    var tempArray = [];

    for (index = 0; index < arrayLength; index += chunk_size) {
        myChunk = myArray.slice(index, index+chunk_size);
        // Do something if you want with the group
        tempArray.push(myChunk);
    }

    return tempArray;
}

exports.annotateImages = function(img_urls) {
  const p = new Promise((res, rej) => {
    const batches = chunkArray(img_urls, 16)
    const all = batches.map((batch) => {
        return axios.post(`https://vision.googleapis.com/v1/images:annotate?alt=json&key=${VISION_SERVER_KEY}`, {
          requests: batch.map((img) => {
            return {
              image: {
                source: {
                  imageUri: img
                }
              },
              features: [
                { type: 'LABEL_DETECTION' },
                // { type: 'IMAGE_PROPERTIES' },
                // { type: 'CROP_HINTS' },
              ]
            }
          })
        })
        .then((data) => {
          console.log(data.data.responses)
          return Promise.resolve(data.data.responses.map((result, i) => {
            return {
              url: img_urls[i],
              caption: result.labelAnnotations.map(lb => lb.description).join(', ')
            }
          }))
        })
        .catch((err) => {
          return Promise.reject(err)
        })
    })
    Promise.all(all).then((results) => {
      let allResults = []
      results.forEach((r) => {
        allResults = allResults.concat(r)
      })
      res(allResults)
    }).catch((err) => {
      console.log(err)
      rej(err)
    })
  })
  return p
}
