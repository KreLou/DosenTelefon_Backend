'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
var ses = new AWS.SES({region: 'eu-west-1'});

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.auth = (event, context, callback) => {
  const connectionId = event.requestContext.connectionId;
  const token = event.requestContext.header.Auth;

//TODO: FIX ME!!! NOT WORKING!!!
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);

  const params = {
    TableName: process.env.CONNECT_TABLE,
    Item: {
      uuid: uuid.v1(),
      user:data.userUuid,
      connectId:connectionId,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  // write the todo to the database
  dynamoDb.put(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t create the user. \n'+error.message
        +'\n fnVersion: '+context.functionVersion
        +'\n functionName: '+context.functionName
        ,
      });
      return;
    }

    var username = params.Item.username == "" ? "" : " " + params.Item.username;

     var mailParams = {
        Destination: {
            ToAddresses: [params.Item.email]
            //ToAddresses: ["success@simulator.amazonses.com"]
        },
        Message: {
            Body: {
                Text: { Data:
                "Hallo"+username+"!\n"+
                "Du hast dich mit dieser Email beim DosenTelefon registriert.\n"+
                "Bitte nutze diesen Link https://dosen-telefon.de/register/"+params.Item.uuid+"/"+params.Item.token+", um dich anzumelden. Das geht jederzeit und von jedem Gerät aus. Dann kann der Dosen-Spaß auch schon direkt beginnen!\n"+
                "Zu deiner eigenen Sicherheit: gib diesen Link bitte nicht an andere weiter, sie könnten sich dann unter deinem Namen beim DosenTelefon anmelden.\n"+
                "Du hast dich nicht beim DosenTelefon registriert? Bitte ignoriere diese Email oder kontaktiere unseren Support https://dosen-telefon.de/abuse\n"+
                "Viel Spaß beim Verdrahten!\n"+
                "Die Dose\n"
                }

            },

            Subject: {
              Data:
              "Registrierung bei Dosen-Telefon.de"
            },
        },
        Source: "registrierung@dosen-telefon.de"
    };


     ses.sendEmail(mailParams, function (err, data) {
        callback(null, {err: err, data: data});
        if (err) {
            console.log(err);
            context.fail(err);
        } else {

            console.log(data);
            context.succeed(event);
        }
    });









    //remove token from response
    params.Item.token = "***";
    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(params.Item),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  });
};
