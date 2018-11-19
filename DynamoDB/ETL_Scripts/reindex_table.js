
const AWS = require('aws-sdk')
const path = require('path')
const pathToAWSConfig = path.join(__dirname, '../../', 'credentials', process.env.NODE_ENV, 'aws_config.json')
const aws_config = require(pathToAWSConfig)
AWS.config.update(aws_config)
const dynaDoc = require("dynamodb-doc");
const Rx = require('rxjs')
const moment = require('moment')
const batchInsertItems = require('../general_insertions').batchInsertItems
const CONVO_HISTORY = require('../../credentials/' + process.env.NODE_ENV + '/dynamodb_tablenames').CONVO_HISTORY

const dynamodb = new AWS.DynamoDB({
  dynamodb: '2012-08-10',
  region: "us-east-1"
})
const docClient = new dynaDoc.DynamoDB(dynamodb)


exports.reindex_dyn = function(params) {
  /*
  	"params": {
        "TableName": "CONVO_HISTORY_DEV",
        "Limit": 24,
        // "IndexName": "By_Local_UserId",
        // "FilterExpression": "#ACTION = :action1 AND #DATE > :date",
        // "ExpressionAttributeNames": {
        //   "#ACTION": "ACTION",
        //   "#DATE": "DATE"
        // },
        // "ExpressionAttributeValues": {
        //   ":action1": "BUILDING_PAGE_LOADED",
        //   ":date": 1512940693
        // }
      }
  */
  const p = new Promise((res, rej) => {
    let Items = []
    let count = 0
    const onNext = ({ obs, params }) => {
      setTimeout(() => {
        console.log('OBSERVABLE NEXT')
        console.log('On cycle # ' + count)
        console.log('=========== accumlated size: ' + Items.length)
        docClient.scan(params, (err, data) => {
          if (err){
            console.log(err, err.stack); // an error occurred
            obs.error(err)
          }else{
            // console.log(data);           // successful response
            Items = Items.concat(data.Items)

            const batch = Items.filter((item) => {
              return !item.UNIX_TIMESTAMP
            }).map((item) => {
              // const keys = Object.getOwnPropertyNames(item)
              // keys.forEach((k) => {
              //   if (!item[k]) {
              //     item[k] = 'CANNOT BE EMPTY'
              //   }
              // })
              item.UNIX_TIMESTAMP = moment(item.TIMESTAMP).valueOf()
              return {
                TableName: CONVO_HISTORY,
                Item: item
              }
            })
            console.log(batch)
            if (batch.length > 0) {
              batchInsertItems(batch).then((batchResp) => {
                console.log('---> Sucessful update')
                console.log(batchResp)
                Items = []
                count++
                if (data.LastEvaluatedKey) {
                  params.ExclusiveStartKey = data.LastEvaluatedKey
                  obs.next({
                    obs,
                    params
                  })
                } else {
                  obs.complete(data)
                }
              }).catch((err) => {
                console.log(err)
                obs.error(err)
              })
            } else {
              console.log('---> Skipping this batch')
              Items = []
              count++
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



// $ NODE_ENV=production node DynamoDB/ETL_Scripts/reindex_table.js
// exports.reindex_dyn({
//   "TableName": CONVO_HISTORY,
//   "Limit": 24
// })

/*

  PROD IMPLEMENTATION STEPS:

  0. Backup prod dyn data
  1. Test with one batch first
  2. If one batch is successful, then do for entire DYN
  3. Remove the BY_RECEIVER_CONTACT index using AWS GUI
  4. Add the BY_UNIX_TIMESTAMP index using AWS GUI
  5. Should be done! Try querying BY_UNIX_TIMESTAMP using AWS GUI

*/
