'use strict';

var url = require('url');
var Transform = require('barrage').Transform;
var Promise = require('promise');
var download = require('./download');

module.exports = addFavicons;

/**
 * Look for favicons and add them to the stream if they exist
 *
 * @returns {TransformStream}
 */
function addFavicons() {
  var stream = new Transform({objectMode: true, highWaterMark: 2});

  var hosts = {};
  var downloads = [];
  stream._transform = function (page, _, callback) {
    stream.push(page);
    var host = url.parse(page.url).host;
    if (!hosts[host]) {
      downloads.push(hosts[host] = download(url.resolve(page.url, '/favicon.ico')).then(function (result) {
        if (result.statusCode === 200 &&
            !(result.headers['content-type'] &&
              result.headers['content-type'].indexOf('html') !== -1)) {
          stream.push(result);
        }
      }, function () {
        //ignore errors downloading favicons
      }));
    }
    callback(null);
  };
  stream._flush = function (callback) {
    Promise.all(downloads).done(function () {
      callback();
    }, function (err) {
      stream.emit('error', err);
      callback();
    });
  };
  
  return stream;
}