'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.defaultHandler = (event, context, callback) => {
  const connectionId = event.requestContext.connectionId;

  console.log("Default handler, got "+connectionId+" to dynamoDB");

  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);
  //TODO: verify token
  console.log(data);
  if (typeof data.version !== 'number' || data.version !== 1) {
      console.error('incorrect message');
      callback(null, {
        statusCode: 400,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Message invalid.',
      });
      return;
  }

  switch (data.event){
    case "link_user":


      const params = {
        TableName: process.env.CONNECT_TABLE,
        Key: {
          connectId: connectionId,
        },
        ExpressionAttributeNames: {
          '#user': 'user'
        },
        ExpressionAttributeValues: {
          ':user': data.body.uuid,
          ':updatedAt': timestamp
        },
        UpdateExpression: 'SET ' +//
                            '#user = :user, ' +//
                            'updatedAt = :updatedAt',
        ReturnValues: 'ALL_NEW',
      };

      // update the todo in the database
      dynamoDb.update(params, (error, result) => {
        // handle potential errors
        if (error) {
          console.error(error);
          callback(null, {
            statusCode: error.statusCode || 501,
            headers: {   'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Credentials': true,
              'Content-Type': 'text/plain' },
            body: 'Couldn\'t update connection.\n'+error.message
            +'\n fnVersion: '+context.functionVersion
            +'\n functionName: '+context.functionName,
          });
          console.log("Default handler, saved "+connectionId+" to dynamoDB");

          return;
        }
      });

      let connectionData;
      console.log("sending response");
      const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: event.requestContext.domainName
      });

      const postData = {
      "version" : 1,
      "event" : "call_request",
      "body" : {
          "openrainbow-details": {
            //tbd
          },
          "username": "Merkel"
        }
      };



      try {
        let send = undefined;

         send = async (connectionId, postData) => {
         await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(postData)  }).promise();
         }
         send(connectionId, postData);
      } catch (e) {
        if (e.statusCode === 410) {
          console.log(`Found stale connection, deleting ${connectionId}`);
          callback(null, {
            statusCode: 410,
            headers: { 'Content-Type': 'text/plain' },
            body: `Found stale connection, deleting ${connectionId}`,
          });
        } else {
          throw e;
        }
      }
//TODO make code nicer https://github.com/aws-samples/simple-websockets-chat-app/blob/master/sendmessage/app.js

      callback(null, {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Data sent.',
      });
      break;
    default:
    var errorMsg = 'Unkown event '+data.event;
    console.error(errorMsg);
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: errorMsg,
    });
    return;
  }





};
