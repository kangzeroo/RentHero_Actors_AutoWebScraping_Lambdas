const fs = require('fs')
const BUCKET_NAME = require('./credentials/' + process.env.NODE_ENV + '/image_bucket').ML_BUCKET
const ML_GS_BUCKET = require('./credentials/' + process.env.NODE_ENV + '/image_bucket').ML_GS_BUCKET
const AUTOML_PROJECT_ID = require('./credentials/' + process.env.NODE_ENV + '/ai-automl-creds.json').project_id
const AUTOML_COMPUTE_REGION = require('./credentials/' + process.env.NODE_ENV + '/automl_dataset_info.json').COMPUTE_REGION
const AUTOML_DATASET_ID = require('./credentials/' + process.env.NODE_ENV + '/automl_dataset_info.json').DATASET_ID

const { Storage } = require('@google-cloud/storage')
const gstore = new Storage({
  projectId: AUTOML_PROJECT_ID,
  keyFilename: './credentials/' + process.env.NODE_ENV + '/ai-automl-creds.json'
})

const googleautoml = require('@google-cloud/automl');
const automl = new googleautoml.AutoMlClient({
  projectId: AUTOML_PROJECT_ID,
  keyFilename: './credentials/' + process.env.NODE_ENV + '/ai-automl-creds.json'
});
const datasetFullId = automl.datasetPath(AUTOML_PROJECT_ID, AUTOML_COMPUTE_REGION, AUTOML_DATASET_ID);

const uuid = require('uuid')
const id = uuid.v4()
const fileName = `test_file_${id}.txt`
const fileContent = "Whats up, dawg"
fs.writeFile(fileName, fileContent, function(err) {
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
      fs.unlink(fileName, function(err){
        console.log('Unliked file!')
      })
      const csvFileName = `test_file_${id}.csv`
      const csvFileContent = `${ML_GS_BUCKET}/${fileName},unlabeled`
      fs.writeFile(csvFileName, csvFileContent, 'utf-8', function(err) {
          if(err) {
              return console.log(err);
          }
          gstore.bucket(BUCKET_NAME).upload(csvFileName, {
            gzip: true,
          }).then((data) => {
            console.log('--------------')
            console.log(data[1])
            console.log('--------------')
            return automl.importData({
              name: datasetFullId,
              inputConfig: {
                gcsSource: {
                  inputUris: [`${ML_GS_BUCKET}/${csvFileName}`]
                }
              },
            })
          }).then((results) => {
            console.log('--------------')
            console.log(results)
            console.log('--------------')
            fs.unlink(csvFileName, function(err){
              console.log('Unliked file!')
            })
          })
          .catch((err) => {
            console.log(err)
          })
      })
    }).catch((err) => {
      console.log(err)
    })
});




// https://console.cloud.google.com/storage/browser/rental_ads_bucket
// NODE_ENV=development node test.js
