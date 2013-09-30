var PassThrough = require('stream').PassThrough || require('readable-stream').PassThrough
var concatStream = require('concat-stream')
var Q = require('q')

module.exports = transform
function transform(res, fn) {
  return Q.promise(function (resolve, reject) {
    res.body.on('error', reject)
    res.body.pipe(concatStream(function (body) {
      try {
        res.body = streamify(fn(body))
        resolve(res)
      } catch (ex) {
        reject(ex)
      }
    }))
  })
}

function streamify(src) {
  var strm = new PassThrough()

  if (typeof src === 'string'  || Buffer.isBuffer(src)) {
    strm.end(src)
  } else {
    src.pipe(strm)
  }

  return strm
}