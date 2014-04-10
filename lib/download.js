'use strict';

var request = require('then-request');
var htmldeps = require('htmldeps');
var cssdeps = require('cssdeps');

module.exports = download;

// todo: retry logic
// {url: 'http://example.com/foo', statusCode: 200, headers: {}, body: <Buffer...>, dependencies: []}
function download(url) {
  return request(url).then(function (res) {
    res.url = url;
    try {
      if (res.statusCode === 302) {
        res.dependencies = [res.headers.location];
      } else if (!res.headers['content-type']) {
        res.dependencies = [];
      } else if (res.headers['content-type'].indexOf('text/html') !== -1) {
        res.dependencies = htmldeps(res.body.toString());
      } else if (res.headers['content-type'].indexOf('text/css') !== -1) {
        res.dependencies = cssdeps(res.body.toString());
      } else {
        res.dependencies = [];
      }
    } catch (ex) {
      ex.message = 'Error parsing deps for "' + url + '": ' + ex.message;
      throw ex;
    }
    return res;
  });
}