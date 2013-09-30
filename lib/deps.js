var detectHTML = require('htmldeps')
var Q = require('q')

var transform = require('./buffer-transform')

module.exports = deps
function deps(res) {
  if (res.isRedirect()) {
    if (!res.headers.location) return Q.reject(new Error('Status code ' + res.statusCode + ' but no location header.'))
    res.dependencies = [res.headers.location]
    return Q(res)
  } else if (res.isHTML()) {
    return transform(res, function (body) {
      res.dependencies = detectHTML(body.toString())
      return body
    })
  } else if (res.isCSS()) {
    return transform(res, function (body) {
      res.dependencies = []
      return body
    })
  } else {
    res.dependencies = []
    return Q(res)
  }
}