
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


exports.query_dynamodb = function(params) {
  /*
  	"params": {
        "TableName": "Building_Interactions_Intel",
        "KeyConditionExpression": "#BUILDING_ID = :building_id",
        "IndexName": "By_Local_UserId",
        "FilterExpression": "#ACTION = :action1 AND #DATE > :date",
        "ExpressionAttributeNames": {
          "#BUILDING_ID": "BUILDING_ID",
          "#ACTION": "ACTION",
          "#DATE": "DATE"
        },
        "ExpressionAttributeValues": {
          ":building_id": "d2daa19f-128f-4043-af84-c1baa970ab81",
          ":action1": "BUILDING_PAGE_LOADED",
          ":date": 1512940693
        }
      }
  */
  const p = new Promise((res, rej) => {
    let Items = []
    const onNext = ({ obs, params }) => {
      setTimeout(() => {
        console.log('OBSERVABLE NEXT')
        console.log('=========== accumlated size: ' + Items.length)

        docClient.query(params, function(err, data) {
          if (err){
            console.log(err, err.stack); // an error occurred
            obs.error(err)
          }else{
            console.log(data);           // successful response
            Items = Items.concat(data.Items)
            if (data.LastEvaluatedKey) {
              params.ExclusiveStartKey = data.LastEvaluatedKey
              obs.next({
                obs,
                params
              })
            } else {
              obs.complete(data)
            }
          }
        })
      }, 1500)
    }
    Rx.Observable.create((obs) => {
      obs.next({
        obs,
        params
      })
    }).subscribe({
      next: onNext,
      error: (err) => {
        console.log('OBSERVABLE ERROR')
        console.log(err)
      },
      complete: (y) => {
        console.log('OBSERVABLE COMPLETE')
        console.log(Items.length)
        res(Items)
      }
    })
  })
  return p
}


exports.scan_dynamodb = function(params) {
  /*
  	"params": {
        "TableName": "Building_Interactions_Intel",
        "IndexName": "By_Local_UserId",
        "FilterExpression": "#ACTION = :action1 AND #DATE > :date",
        "ExpressionAttributeNames": {
          "#ACTION": "ACTION",
          "#DATE": "DATE"
        },
        "ExpressionAttributeValues": {
          ":action1": "BUILDING_PAGE_LOADED",
          ":date": 1512940693
        }
      }
  */
  const p = new Promise((res, rej) => {
    let Items = []
    const onNext = ({ obs, params }) => {
      setTimeout(() => {
        console.log('OBSERVABLE NEXT')
        console.log('=========== accumlated size: ' + Items.length)
        docClient.scan(params, (err, data) => {
          if (err){
            console.log(err, err.stack); // an error occurred
            obs.error(err)
          }else{
            console.log(data);           // successful response
            Items = Items.concat(data.Items)
            if (data.LastEvaluatedKey) {
              params.ExclusiveStartKey = data.LastEvaluatedKey
              obs.next({
                obs,
                params
              })
            } else {
              obs.complete(data)
            }
          }
        })
      }, 1500)
    }
    Rx.Observable.create((obs) => {
      obs.next({
        obs,
        params
      })
    }).subscribe({
      next: onNext,
      error: (err) => {
        console.log('OBSERVABLE ERROR')
        console.log(err)
      },
      complete: (y) => {
        console.log('OBSERVABLE COMPLETE')
        console.log(Items.length)
        res(Items)
      }
    })
  })
  return p
}
