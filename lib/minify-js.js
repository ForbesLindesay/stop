'use strict';

var barrage = require('barrage');
var UglifyJS = require('uglify-js');
var chalk = require('chalk');
var prettyBytes = require('pretty-bytes');
var figures = require('figures');
var arrow = ' ' + figures.arrowRight + ' ';

function formatSize(size, tag) {
  return chalk.green(prettyBytes(size)) + ' ' + chalk.gray('(' + tag + ')');
}
module.exports = minifyJS;
function minifyJS(options) {
  options = options || {};
  var silent = options.silent;
  if ('silent' in options) delete options.silent;
  var filter = options.filter;
  if ('filter' in options) delete options.filter;
  var stream = new barrage.Transform({objectMode: true});
  stream._transform = function (page, _, cb) {
    if (page.headers['content-type'].indexOf('application/javascript') !== -1 && (!filter || filter(page.url))) {
      if (!silent) {
        console.log(chalk.blue('minfing ') + page.url);
      }
      var before = page.body.length;
      var sys = require("util");
      var warn = UglifyJS.AST_Node.warn_function;
      UglifyJS.AST_Node.warn_function = function (warning) {
        if (!silent) {
          console.log(chalk.yellow('WARN: ') + warning.replace(/\?\:/, ''));
        }
      };
      options.warnings = options.warnings !== false;
      options.fromString = true;
      page.body = new Buffer(UglifyJS.minify(page.body.toString(), options).code);
      UglifyJS.AST_Node.warn_function = warn;
      var after = page.body.length;
      if (!silent) {
        console.log(formatSize(before, 'source') + arrow + formatSize(after, 'minify'));
      }
    }
    stream.push(page);
    cb();
  };
  return stream;
}
