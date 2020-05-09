'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const connectionDB  =  require( '../libs/connection-db.js');
const userDB  =  require( '../libs/user-db.js');
const websockets  =  require( '../libs/websockets.js');
const utils  =  require( '../libs/utils.js');

function wrapReturn(returnData){
  let ret={
    "statusCode": returnData.statusCode,
    "headers": {   'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'text/plain' },
    "body": returnData.message
  };
  console.log("returning", ret);
  return ret;
}


module.exports.defaultHandler = async (event, context, callback) => {
  try {
    const connectionId = event.requestContext.connectionId;
    let returnData ={};
    const data = JSON.parse(event.body);

    console.log("Default handler, got "+connectionId);

    if (typeof data.version !== 'number' || data.version !== 1 || !data.auth || !data.auth.uuid || !data.auth.token) {
        console.error('incorrect message');
        callback(null, {
          statusCode: 400,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Message invalid.',
        });
        return;
    }

    try {
      if(!data.auth.uuid || !data.auth.token || !await userDB.auth(data.auth.uuid, data.auth.token)){
        console.error("authentication failed.")

        await websockets.sendWebSocketMessage(connectionId, {
          "version" : 1,
          "event" : "authentication_failed",
          "body" : {
              "message":"Authentication failed!"
            }
        },event.requestContext.domainName);
        return {statusCode: 401,body: JSON.stringify({message:"Not authenticated."}), headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true,}};

      }
    } catch (e) {
      throw e;
    }



  console.log("Event: " +data.event);

    switch (data.event){
      case "link_user":

        let userUuid =data.body.uuid;
        let peerId =data.body.peerId;
        if(userUuid != data.auth.uuid){
          console.log(`Not authenticated ${userUuid}  != ${data.auth.uuid}`);

          callback(null, {statusCode: 401,body: JSON.stringify({message:"Not authenticated."}), headers: {'Access-Control-Allow-Origin': '*','Access-Control-Allow-Credentials': true,}});
          return;
        }
        console.log("link_user in database");
        returnData = await connectionDB.linkUserToConnection(connectionId,userUuid,peerId);
        console.log(returnData);
        if(returnData.statusCode != 200){
          return wrapReturn(returnData)
        }

        var match = await userDB.findMatch(userUuid);


        if(match == undefined){
          //don't send a websocket response back.
          return wrapReturn({statusCode:200,message:"No match, found waiting."});
        }
        else {
          console.log("found matching user '"+match.body.uuid+"'")

          //send both users the token
          //TODO make code nicer https://github.com/aws-samples/simple-websockets-chat-app/blob/master/sendmessage/app.js
          let connectionDetails,connectionId;

          //load both connections
          let connectionNewUser = await connectionDB.getConnection(userUuid);
          console.log("after getConnection",connectionNewUser);
          if(connectionNewUser.statusCode != 200){
            console.log("could not find session for user connectionNewUser '"+userUuid+"': ", connectionNewUser);
            return wrapReturn(connectionNewUser);
          }
          let connectionIdNewUser = connectionNewUser.body.connectId;


          let connectionExistingUser = await connectionDB.getConnection(match.body.uuid);
          if(connectionExistingUser.statusCode != 200){
            console.log("could not find session for user connectionExistingUser '"+match.body.uuid+"': ", connectionExistingUser);
            return wrapReturn(connectionExistingUser);
          }
          let connectionIdExistingUser = connectionExistingUser.body.connectId;

          let existingUserDetails = await userDB.getUserDetails(match.body.uuid);
          let newUserDetails = await userDB.getUserDetails(userUuid);


          returnData = await websockets.sendWebSocketMessage(connectionIdNewUser, {
            "version" : 1,
            "event" : "call_request",
            "body" : {
                "peerId":connectionExistingUser.body.peerId,
                "username":   existingUserDetails.username,
                "caller": true
              }
            },event.requestContext.domainName);
            console.log("returnData.statusCode",returnData.statusCode);
          if(returnData.statusCode != 200){
            console.log("sending message to websocket failed: ", returnData);
            if (returnData.statusCode == 410){
              //staled connection, removing
              let returnData = await connectionDB.deleteConnection(connectionIdNewUser);
            }
            return wrapReturn(callback, returnData);
          }


          returnData = await websockets.sendWebSocketMessage(connectionIdExistingUser, {
            "version" : 1,
            "event" : "call_request",
            "body" : {
                "peerId":connectionNewUser.body.peerId,
                "username": newUserDetails.username,
                "caller": false
              }
          },event.requestContext.domainName);
          if(returnData.statusCode != 200){
              if (returnData.statusCode == 410){
              //staled connection, removing
              let returnData = await connectionDB.deleteConnection(connectionIdExistingUser);
            }
            console.log("sending message to websocket failed: ", returnData);
            return wrapReturn(callback, returnData);
          }

          //both user informed, mark as pending



          await userDB.pendingState(userUuid, true);
          await userDB.pendingState(match.body.uuid, true);
          await connectionDB.linkConnections(connectionIdExistingUser, userUuid, connectionIdNewUser);
          await connectionDB.linkConnections(connectionIdNewUser, match.body.uuid, connectionIdExistingUser);


        return wrapReturn({statusCode:200,message:"Match found, tokens send."});

      }

        break;
      case "call_accepted":
          let connection = {};
          try {
            await connectionDB.getConnectionByConnectionId(connectionId
            ).then((con)=>{
              connection = con;
              return userDB.activeState(connection.user,false);
            }).then(()=>{
             return userDB.pendingState(connection.user,false)
            });
          } catch (e) {
            return wrapReturn({
              statusCode: 400,
              headers: { 'Content-Type': 'text/plain' },
              body: `Error removing user from lobby ${e.message}`
            });
          }

      default:
      //forward all other events to the other client
      let interlocutorConnectionId = await connectionDB.getInterlocutor(connectionId);
      if(interlocutorConnectionId) {
        returnData = await websockets.sendWebSocketMessage(interlocutorConnectionId, {
            "version" : 1,
            "event" : data.event,
            "body" : event.body
          },event.requestContext.domainName);
          if(returnData.statusCode != 200){
              if (returnData.statusCode == 410){
              //staled connection, removing
              let returnData = await connectionDB.deleteConnection(interlocutorConnectionId);
            }
            console.log("sending message to websocket failed: ", returnData);
            return wrapReturn(callback, returnData);
          }
        }
      return wrapReturn({statusCode:200,message:"Forwarded message."});

        return;
      }
    }
    catch (errorMsg) {
      console.error(errorMsg);
      return wrapReturn({
        statusCode: 500,
        headers: { 'Content-Type': 'text/plain' },
        body: errorMsg,
      });
    } finally {

    }
};
