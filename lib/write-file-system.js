'use strict';

var fs = require('fs');
var path = require('path');
var url = require('url');
var mkdirp = require('mkdirp');
var Writable = require('barrage').Writable;

module.exports = writeFileSystem;
function writeFileSystem(basedir) {
  var stream = new Writable({objectMode: true});
  stream._write = function (page, _, callback) {
    var pathname = path.join(basedir, url.parse(page.url).pathname);
    var body = page.body;
    if (page.headers['content-type'] &&
        page.headers['content-type'].indexOf('html') !== -1 &&
        !/\.[a-zA-Z]+$/.test(pathname)) {
      pathname = path.join(pathname, 'index.html');
    }
    if (page.statusCode === 200) {
      mkdirp(path.dirname(pathname), function (err) {
        if (err) return callback(err);
        fs.writeFile(pathname, body, callback);
      });
    } else {
      callback();
    }
  };
  return stream;
}