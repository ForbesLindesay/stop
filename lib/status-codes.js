'use strict';

var Transform = require('barrage').Transform;

module.exports = statusCodes;

/**
 * Limit status codes to a list of allowed status codes
 *
 * @param {Array.<Number>} allowed
 * @param {Array.<Number>} ignored
 * @returns {TransformStream}
 */
function statusCodes(allowed, ignored, options) {
  var stream = new Transform({objectMode: true});
  var errored = false;

  stream._transform = function (page, _, callback) {
    if (errored) return callback(null);
    if (ignored && ignored.indexOf(page.statusCode) !== -1) return callback(null);
    if (!allowed || allowed.indexOf(page.statusCode) !== -1) {
      stream.push(page);
      return callback(null);
    }
    errored = true;
    stream.emit('error', new Error('Invalid status code ' + page.statusCode + ' - ' + page.url));
    callback(null);
  };

  return stream;
}
