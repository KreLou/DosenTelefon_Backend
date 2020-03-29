'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var http = require('https');


const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.findMatch = (userUuid) => {
  let returnData={};
  const paramsForGet = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      uuid: userUuid,
    }
  };
  dynamoDb.get(paramsForGet, (error, result) => {
    // handle potential errors
    if (error) {
      returnData.statusCode = error.statusCode || 501;
      returnData.message = error.message;
      returnData.error = error;
      return;
    }

    if(result.Item){
      returnData.statusCode =200;
      result.Item.token = "***";
      result.Item.newToken = "***";
      returnData.body = result.Item;
      // create a response
    }
  });
  if(returnData.statusCode != 200 ){
    return returnData;
  }

  //find users which do not have things in interessted where the other have it in notInteressted.

  //TODO: And user is "active" => in lobby
  //TODO: find not the same user
  const paramsForScan = {
    TableName: process.env.DYNAMODB_TABLE,
    FilterExpression: "NOT contains (topicsNotOK, :topicsNotOK)",
    ExpressionAttributeValues: {
      ':topicsNotOK': returnData.body.topicsOK
    },
    Limit: 1
  };

  // fetch todo from the database
  dynamoDb.scan(paramsForScan, (error, result) => {
    if (err) {
      console.log("Error", err);
      returnData.statusCode = error.statusCode || 501;
      returnData.message = error.message;
      returnData.error = error;
    } else {
      //console.log("Success", data.Items);
      if(data.Items.length != 0){
        //just take the first one
        let item = data.Items[0];
        returnData.statusCode =200;
        item.token = "***";
        item.newToken = "***";
        returnData.body = item;
      }
    }

  });
  return returnData;
}
