
const AWS = require('aws-sdk')
const path = require('path')
const pathToAWSConfig = path.join(__dirname, '..', 'credentials', process.env.NODE_ENV, 'aws_config.json')
const aws_config = require(pathToAWSConfig)
AWS.config.update(aws_config)
const dynaDoc = require("dynamodb-doc");
const Rx = require('rxjs')

const dynamodb = new AWS.DynamoDB({
  dynamodb: '2012-08-10',
  region: "us-east-1"
})
const docClient = new dynaDoc.DynamoDB(dynamodb)

// to insert or update an entry
exports.insertIntel = function(intel, tableName){
  const p = new Promise((res, rej) => {
    const intelObj = {
      'TableName': tableName,
      'Item': intel,
    }
    console.log("============ INTEL OBJ ==============")
    console.log(intelObj)
    docClient.putItem(intelObj, function(err, data) {
      if (err){
          console.log(JSON.stringify(err, null, 2));
          rej()
      }else{
          console.log('INTEL INSERTION SUCCESS!')
          res()
      }
    })
  })
  return p
}

exports.batchInsertItems = function(items){
  console.log('batchInsertItems')
  /*
    items = [
      {
        'TableName': tableName,
        'Item': intel,
      }
    ]
  */
  const p = new Promise((res, rej) => {
    if (items.length > 0) {
      const params = {
        RequestItems: {
          [items[0].TableName]: items.map((item) => {
            return {
              PutRequest: {
                Item: item.Item
              }
            }
          })
        }
      }
      docClient.batchWriteItem(params, function(err, data) {
        if (err){
            console.log(JSON.stringify(err, null, 2));
            console.log(err)
            rej()
        }else{
            console.log('INTEL BATCH INSERTION SUCCESS!')
            res()
        }
      })
    }
  })
  return p
}
