'use strict';

var request = require('then-request');
var htmldeps = require('htmldeps');
var cssdeps = require('cssdeps');

module.exports = download;

// todo: retry logic
// {url: 'http://example.com/foo', statusCode: 200, headers: {}, body: <Buffer...>, dependencies: []}
function download(url) {
  return request('GET', url).then(function (res) {
    var out = {
      url: url,
      body: res.body,
      statusCode: res.statusCode,
      headers: res.headers,
      dependencies: []
    };

    try {
      if (out.statusCode === 302) {
        out.dependencies = [out.headers.location];
      } else if (!out.headers['content-type']) {
        out.dependencies = [];
      } else if (out.headers['content-type'].indexOf('text/html') !== -1) {
        out.dependencies = htmldeps(out.body.toString());
      } else if (out.headers['content-type'].indexOf('text/css') !== -1) {
        out.dependencies = cssdeps(out.body.toString());
      } else {
        out.dependencies = [];
      }
    } catch (ex) {
      ex.message = 'Error parsing deps for "' + url + '": ' + ex.message;
      throw ex;
    }
    return out;
  });
}
