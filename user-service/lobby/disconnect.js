'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var ses = new AWS.SES({region: 'eu-west-1'});

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const connectionDB  =  require( '../libs/connection-db.js');
const websockets  =  require( '../libs/websockets.js');

module.exports.disconnectHandler = async (event, context, callback) => {
  const timestamp = new Date().getTime();
  const connectionId = event.requestContext.connectionId;
  console.log("Disconnect, removing "+connectionId+" from dynamoDB");
  let interlocutorConnectionId = await connectionDB.getInterlocutor(connectionId);
  if(interlocutorConnectionId){
    let returnData = await websockets.sendWebSocketMessage(interlocutorConnectionId, {
        "version" : 1,
        "event" : "interlocutor-ws-connection-disconnected",
        "body" : {}
      },event.requestContext.domainName);
      if(returnData.statusCode != 200){
        //ignore failures, maybe other connection was already removed.
        console.log("sending message to websocket failed: ", returnData);
      }
  }
  let response = await connectionDB.deleteConnection(connectionId);
  response.body = response.message;
  callback(null, response);

};
