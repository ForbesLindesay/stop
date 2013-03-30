"use strict";

var through = require('through');
var readdirp = require('readdirp');
var express = require('express');
var hyperquest = require('hyperquest');
var mkdir = require('mkdirp').sync;
var rfile = require('rfile');

var dirname = require('path').dirname;
var join = require('path').join;
var resolve = require('path').resolve;
var write = require('fs').createWriteStream;

module.exports = Application;
function Application(isStatic) {
  if (!(this instanceof Application)) return new Application(isStatic);
  this.isStatic = isStatic;
  if (isStatic) {
    process.env.NODE_ENV = 'production';
  }
  this.express = express();
  this.paths = [];
}

Application.prototype.get = function (path) {
  if (arguments.length === 1) {
    return this.express.get(path);
  }
  if (/^\/(?:[a-z0-9\-\_\.]\/?)*$/.test(path)) {
    this.paths.push(path);
    this.express.get.apply(this.express, arguments);
  } else {
    throw new Error('Paths for stop can only be `a-z`, `0-9`, `_`, `-` and `.`');
  }
  return this;
};

Application.prototype.favicon = function (filepath, options) {
  this.paths.push('/favicon.ico');
  this.express.use(express.favicon(rfile.resolve(filepath, {exclude: [__filename]}), options));
  return this;
};

Application.prototype.file = function (path, filepath) {
  this.paths.push(path);
  var filepath = rfile.resolve(filepath, {exclude: [__filename]});
  this.express.get(path, function (req, res) {
    res.sendfile(filepath);
  });
  return this;
};

Application.prototype.directory = function (path, filepath, opts) {
  opts = opts || {};
  var options = {
    hidden: opts.hidden || false
  };
  filepath = resolve(directory(), filepath);
  this.paths.push(function () {
    return readdirp({
      directoryFilter: '!node_modules',
      fileFilter: filterHidden(!options.hidden),
      root: filepath
    })
    .pipe(addBase(path));
  });
  this.express.use(path, express.static(filepath, options));
  return this;
};

function directory(exclude) {
  var stack = callsite();
  for (var i = 0; i < stack.length; i++) {
    var filename = stack[i].getFileName();
    if (filename !== __filename && (!exclude || (exclude.indexOf(filename) === -1)))
      return dirname(filename);
  }
  throw new Error('Could not resolve directory');
}

Application.prototype.readPaths = function (cb) {
  var done = false;
  var pending = this.paths.length;
  var paths = [];
  for (var i = 0; i < this.paths.length; i++) {
    if (typeof this.paths[i] === 'string') {
      paths.push(this.paths[i]);
      --pending;
    } else if (typeof this.paths[i] === 'function') {
      var strm = this.paths[i]();
      strm.on('data', function (path) {
        paths.push(path);
      });
      strm.on('end', function () {
        if (0 === --pending) return cb(null, paths);
      });
    }
  }
  if (0 === pending) return cb(null, paths);
}

Application.prototype.download = function (port, path, outputDir, callback) {
  var dest = join(outputDir, path.replace(/(\/[^\.]*)$/, '$1/index.html').replace(/\/+/g, '/'));
  console.dir(dest);
  mkdir(dirname(dest));
  hyperquest('http://localhost:' + port + path)
    .pipe(write(dest))
    .on('close', function () {
      callback();
    });
};

Application.prototype.run = function (outputDir, port, callback) {
  callback = callback || function (err, port) {
    if (err) throw err;
    if (port) {
      console.log('listening on localhost:' + port);
    } else {
      console.log('site build complete');
    }
  }
  if (this.isStatic) {
    var self = this;
    var express = this.express;
    this.readPaths(function (err, paths) {
      if (err) return callback(err);
      express.listen(0, function () {
        var server = this;
        var port = server.address().port;
        var pending = paths.length;

        for (var i = 0; i < paths.length; i++) {
          self.download(port, paths[i], outputDir, function (err) {
            if (err) return callback(err);

            if (0 === --pending) {
              server.close(function () {
                callback();
              });
            }
          })
        }

        if (pending === 0) {
          server.close(function () {
            callback();
          });
        }
      });
    })
  } else {
    this.express.listen(port, function () {
      var port = this.address().port;
      callback(null, port);
    });
  }
};

function filterHidden(active) {
  if (!active) {
    return function () { return true; }
  }
  return function (fileInfo) {
    return fileInfo.name[0] !== '.';
  }
}
function addBase(base) {
  return through(function (fileInfo) {
    this.queue((base + '/' + fileInfo.path.replace(/\\/g, '/')).replace(/\/+/g, '/'));
  })
}