"use strict";

var url = require('url');
var Readable = require('barrage').Readable;
var Promise = require('promise');
var throat = require('throat');
var download = require('./lib/download.js');

exports.log = require('./lib/log.js');
exports.checkStatusCodes = require('./lib/status-codes.js');
exports.addFavicon = require('./lib/favicon.js');
exports.minifyJS = require('./lib/minify-js.js');
exports.minifyCSS = require('./lib/minify-css.js');
exports.addManifest = require('./lib/manifest.js');

exports.writeFileSystem = require('./lib/write-file-system.js');

exports.getWebsiteStream = getWebsiteStream;

/**
 * Gets a stream of web pages from a starting point
 * where each object in the stream looks like:
 *
 * {
 *   url: 'http://example.com/foo',
 *   statusCode: 200,
 *   headers: {},
 *   body: <Buffer...>,
 *   dependencies: []
 * }
 */
function getWebsiteStream(start, options) {
  var highWaterMark = 2;
  if (options && options.highWaterMark) {
    highWaterMark = options.highWaterMark;
  } else if (options && options.parallel) {
    highWaterMark = options.parallel + 1;
  }
  var stream = new Readable({
    objectMode: true,
    highWaterMark: highWaterMark
  });

  var downloaded = {};
  function handleUri(uri, push) {
    uri = uri.split('#')[0];
    if (downloaded[uri] === true || !isHttp(uri) || !filter(options, uri)) {
      return Promise.resolve(null);
    }
    downloaded[uri] = true;
    return download(uri).then(function (result) {
      result.dependencies.forEach(function (dependency) {
        push(url.resolve(uri, dependency));
      });
      return result;
    });
  }

  var queue = Array.isArray(start) ? start : [start];
  var finished = false;
  var inProgress = 0;
  function process(session) {
    if (inProgress === 0 && !finished && queue.length === 0) {
      finished = true;
      stream.push(null);
    }
    if (queue.length === 0) {
      return;
    }
    inProgress++;
    return handleUri(queue.shift(), queue.push.bind(queue)).done(function (result) {
      inProgress--;
      if (finished) return;
      if (result !== null) {
        if (stream.push(result) && session.live) {
          process(session);
        } else {
          session.live = false;
        }
      } else if (session.live) {
        process(session);
      }
    }, function (err) {
      inProgress--;
      if (finished) return;
      finished = true;
      stream.emit('error', err);
      stream.push(null);
    });
  }

  var session = {live: false};
  stream._read = function () {
    if (session.live) return;
    session = {live: true};
    if (options && options.parallel) {
      for (var i = 0; i < options.parallel; i++) {
        process(session);
      }
    } else {
      process(session);
    }
  };

  return stream;
}

function isHttp(uri) {
  return ['http:', 'https:'].indexOf(url.parse(uri).protocol) !== -1;
}
function filter(options, uri) {
  return !(options && options.filter && !options.filter(uri));
}
