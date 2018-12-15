const fs = require('fs')
const BUCKET_NAME = require('../../credentials/' + process.env.NODE_ENV + '/image_bucket').ML_BUCKET
const ML_GS_BUCKET = require('../../credentials/' + process.env.NODE_ENV + '/image_bucket').ML_GS_BUCKET
const AUTOML_PROJECT_ID = require('../../credentials/' + process.env.NODE_ENV + '/ai-automl-creds.json').project_id
const AUTOML_COMPUTE_REGION = require('../../credentials/' + process.env.NODE_ENV + '/automl_dataset_info.json').COMPUTE_REGION
const AUTOML_DATASET_ID = require('../../credentials/' + process.env.NODE_ENV + '/automl_dataset_info.json').DATASET_ID

const { Storage } = require('@google-cloud/storage')
const gstore = new Storage({
  projectId: AUTOML_PROJECT_ID,
  keyFilename: '../../credentials/' + process.env.NODE_ENV + '/ai-automl-creds.json'
})

const googleautoml = require('@google-cloud/automl');
const automl = new googleautoml.AutoMlClient({
  projectId: AUTOML_PROJECT_ID,
  keyFilename: '../../credentials/' + process.env.NODE_ENV + '/ai-automl-creds.json'
});
const datasetFullId = automl.datasetPath(AUTOML_PROJECT_ID, AUTOML_COMPUTE_REGION, AUTOML_DATASET_ID);


const fileName = "test_file_2.csv"
const fileContent = `text
nomoredeaddogs`
fs.writeFile(fileName, fileContent, { encoding: 'utf-8' }, function(err) {
    if(err) {
        return console.log(err);
    }
    console.log("The file was saved!");
    gstore.bucket(BUCKET_NAME).upload(fileName, {
      gzip: true,
    }).then((data) => {
      console.log('--------------')
      console.log(data[1])
      console.log('--------------')
      return automl.importData({
        name: datasetFullId,
        inputConfig: {
          gcsSource: {
            inputUris: [`${ML_GS_BUCKET}/${fileName}`]
          }
        },
      })
    }).then((results) => {
      console.log('--------------')
      console.log(results)
      console.log('--------------')
      fs.unlink(fileName, function(err){
        console.log('Unliked file!')
      })
    }).catch((err) => {
      console.log(err)
    })
});




// https://console.cloud.google.com/storage/browser/rental_ads_bucket
// NODE_ENV=development node test.js
