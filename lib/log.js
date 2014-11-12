'use strict';

var Transform = require('barrage').Transform;
var chalk = require('chalk');

module.exports = log;
function log() {
  var stream = new Transform({objectMode: true});
  stream._transform = function (page, _, callback) {
    var status = page.statusCode;
    if (status < 200) {
      status = chalk.cyan(status);
    } else if (status < 300) {
      status = chalk.green(status);
    } else if (status < 400) {
      status = chalk.magenta(status);
    } else if (status < 500) {
      status = chalk.yellow(status);
    } else  {
      status = chalk.red(status);
    }
    console.log(status + ' - ' + page.url);
    stream.push(page);
    callback(null);
  };

  return stream;
}
