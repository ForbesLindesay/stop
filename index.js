"use strict";

var url = require('url');
var Readable = require('barrage').Readable;
var Promise = require('promise');
var throat = require('throat');
var download = require('./lib/download.js');

exports.checkStatusCodes = require('./lib/status-codes.js');
exports.addFavicon = require('./lib/favicon.js');
exports.minify = require('./lib/minify.js');
exports.addManifest = require('./lib/manifest.js');

exports.getWebsiteStream = getWebsiteStream;
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
      return Promise.from(null);
    }
    downloaded[uri] = true;
    return download(uri).then(function (result) {
      result.dependencies.forEach(function (dependency) {
        push(url.resolve(uri, dependency));
      });
      return result;
    });
  }

  var queue = [start];
  var finished = false;
  var inProgress = 0;
  function process(session) {
    if (inProgress === 0 && !finished && queue.length === 0) {
      finished = true;
      stream.push(null);
      console.log('end');
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
          if (session.live) console.log('pause');
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
    console.log('start');
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

//download('http://www.iana.org/_js/2013.1/iana.js').done(console.dir);

getWebsiteStream('http://lesscss.org', {
  filter: function (currentURL) {
    return true;
    return url.parse(currentURL).hostname === 'lesscss.org';
  },
  parallel: 2
})
.syphon(require('./lib/favicon.js')())
.syphon(require('./lib/manifest.js')('/app.manifest', {addLinks: true}))
.on('data', function (res) {
  console.log(res.statusCode + ': ' + res.url);
})
.on('error', function (err) {
  throw err;
})
.on('end', function () {
  console.log('stream ended');
});

