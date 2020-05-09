'use strict';
var https = require('https');
var util = require('util');

module.exports.recieve = (event, context) => {
    console.log(JSON.stringify(event, null, 2));
    console.log('From SNS:', event.Records[0].Sns.Message);
    var message = event.Records[0].Sns.Message;
    var subject = "General Notification";
    var data = {};

//might be null, more resilent because not all messages are known
    try {
      data = JSON.parse(message);
    } catch (e) {
      //silently ignore
    }

    //prepare subject
    if(event.Records[0].Sns.Subject && event.Records[0].Sns.Subject != "null"){
      subject = event.Records[0].Sns.Subject;
    }
    else if(data.notificationType) {
      subject = data.notificationType;
    }
    else {
      subject = "General Notification";
    }

    var postData = {
        "channel": "#9_bounce_complain_abuse",
        "username": "DosenTelefon Bounce Complain Abuse",
        "text": "*" + subject + "*",
        "icon_emoji": ":aws:"
    };

    //severity
    var severity = "good";

    var dangerMessages = [

        "Complaint",
        " but with errors",
        " to RED",
        "During an aborted deployment",
        "Failed to deploy application",
        "Failed to deploy configuration",
        "has a dependent object",
        "is not authorized to perform",
        "Pending to Degraded",
        "Stack deletion failed",
        "Unsuccessful command execution",
        "You do not have permission",
        "Your quota allows for 0 more running instance"];

    var warningMessages = [
        "bounce",
        " aborted operation.",
        " to YELLOW",
        "Adding instance ",
        "Degraded to Info",
        "Deleting SNS topic",
        "is currently running under desired capacity",
        "Ok to Info",
        "Ok to Warning",
        "Pending Initialization",
        "Removed instance ",
        "Rollback of environment"
        ];

    for(var dangerMessagesItem in dangerMessages) {
        if (message.indexOf(dangerMessages[dangerMessagesItem]) != -1) {
            severity = "danger";
            break;
        }
    }

    // Only check for warning messages if necessary
    if (severity == "good") {
        for(var warningMessagesItem in warningMessages) {
            if (message.indexOf(warningMessages[warningMessagesItem]) != -1) {
                severity = "warning";
                break;
            }
        }
    }

    //parse out email message if possible (to see it in slack)
    if(data.notificationType && "Received" == data.notificationType ){
      try {
        message = data.content;
      }
      catch(e){
        console.log(e);
      }
    }

    postData.attachments = [
        {
            "color": severity,
            "text": message
        }
    ];

    var options = {
        method: 'POST',
        hostname: 'hooks.slack.com',
        port: 443,
        path: '/services/T010MNXEAPN/B013BQW8W3U/IG0oKBZRikuZiNq1Eo8VAhIM'

        //path: '/services/T010MNXEAPN/B012X46BZL2/OSSr49O8E6wYdm8HllefNmls'
    };
    console.log("before promise");

    return new Promise(function(resolve, reject) {
      console.log("in promise");

      var req = https.request(options, function(res) {
        console.log("in https request");

        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          console.log("on data", chunk);

          context.done(null);
          resolve();
        });
      });

      req.on('error', function(e) {
        console.log("in error ",e);

        reject(e);
        console.log('problem with request: ' + e.message);
      });

      req.write(util.format("%j", postData));
      console.log("after write  ");

      req.end();
      console.log("after end  ");

    });
};
