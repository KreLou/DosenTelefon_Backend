'use strict';
// Hint: use the create lambda function
//then blueprint, cloudfront, then add this code
//use region us-east-1
module.exports.rewrite = async event => {

      // Get request from CloudFront event
      var request = event.Records[0].cf.request;

      // Extract the URI from the request
      var requestUrl = request.uri;

      // Match url ending with '/' and replace with /index.html
      var redirectUrl = requestUrl.replace(/^(.*)$/, '\/index.html');

      // Replace the received URI with the URI that includes the index page
      request.uri = redirectUrl;
      // Return to CloudFront
      return request;
};
