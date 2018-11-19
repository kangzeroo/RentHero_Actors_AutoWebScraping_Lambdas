const AWS = require('aws-sdk')
const path = require('path')
const pathToAWSConfig = path.join(__dirname, '../../../', 'credentials', process.env.NODE_ENV, 'aws_config.json')
const aws_config = require(pathToAWSConfig)
AWS.config.update(aws_config)
const RENTAL_LISTINGS = require(`../../../credentials/${process.env.NODE_ENV}/dynamodb_tablenames`).RENTAL_LISTINGS


const rentalListingsTableParams = {
    TableName : RENTAL_LISTINGS,
    KeySchema: [
        // USE CASE: ALLOWS ME TO SEE ALL USER PREFERENCES INTEL IN CHRONOLOGICAL ORDER. EG: USER LOOKS FOR ENSUITE FIRST BEFORE CHANGING THEIR FILTERS TO LOOK FOR LESS ROOMATES NO ENSUITE
        { AttributeName: "DATE_POSTED_UNIX", KeyType: "HASH" },  //Partition key
        { AttributeName: "ITEM_ID", KeyType: "RANGE" },  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "DATE_POSTED_UNIX", AttributeType: "S" },
        { AttributeName: "ITEM_ID", AttributeType: "S" },
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
    },
    GlobalSecondaryIndexes: [

    ]
}

exports.createTables = function(){

  console.log("==> About to create DynamoDB tables!")

  const dynamodb = new AWS.DynamoDB({
    dynamodb: '2012-08-10',
    region: "us-east-1"
  })

  dynamodb.createTable(rentalListingsTableParams, function(err, data) {
      if (err)
          console.log(JSON.stringify(err, null, 2));
      else
          console.log(JSON.stringify(data, null, 2));
  })
}

exports.deleteTable = function() {
  var params = {
  TableName: RENTAL_LISTINGS
 };
 const dynamodb = new AWS.DynamoDB({
   dynamodb: '2012-08-10',
   region: "us-east-1"
 })
 dynamodb.deleteTable(params, function(err, data) {
   if (err) console.log(err, err.stack); // an error occurred
   else     console.log(data);           // successful response
   /*
   data = {
    TableDescription: {
     ItemCount: 0,
     ProvisionedThroughput: {
      NumberOfDecreasesToday: 1,
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
     },
     TableName: "Music",
     TableSizeBytes: 0,
     TableStatus: "DELETING"
    }
   }
   */
 });
}
