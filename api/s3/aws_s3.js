const AWS = require('aws-sdk')
const path = require('path')
const pathToAWSConfig = path.join(__dirname, '../..', 'credentials', process.env.NODE_ENV, 'aws_config.json')
const aws_config = require(pathToAWSConfig)
AWS.config.update(aws_config)
const axios = require('axios')
const uuid = require('uuid')
const S3_BUCKET = require('../../credentials/' + process.env.NODE_ENV + '/image_bucket').S3_BUCKET

exports.backupImages = function(images) {
  // const images = [ 'url_1', 'url_2' ]
  const p = new Promise((resolve, reject) => {
    const s3 = new AWS.S3()
    const promiseArray = images.filter(i => i).map((img_url) => {
      return saveAndUpload(img_url, s3)
    })
    Promise.all(promiseArray)
      .then((backedup_images) => {
        // console.log(backedup_images.filter(i => i))
        resolve(backedup_images.filter(i => i))
      }).catch((err) => {
        reject(err)
      })
  })
  return p
}

const saveAndUpload = function(img_url, s3) {
  const x = img_url.split('.')
  const fileExt = x[x.length-1]
  const p = new Promise((res, rej) => {
    axios({
      method: 'get',
      url: img_url,
      responseType: 'stream',
    })
    .then((response) => {
      // console.log(response.data)
      const params = {Bucket: S3_BUCKET, Key: `${uuid.v4()}.png`, Body: response.data};
      const options = {partSize: 10 * 1024 * 1024, queueSize: 1};
      s3.upload(params, options, function(err, data) {
        if (err) {
          console.log(err)
          res()
        } else {
          // console.log(data)
          res(data.Location)
        }
      });
    })
    .catch((err) => {
      res()
    })
  })
  return p
}
