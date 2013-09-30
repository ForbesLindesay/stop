var js = require('uglify-js').minify
var css = require('css')
var Q = require('q')

var transform = require('./buffer-transform')

module.exports = minify
function minify(res, options) {
  if (arguments.length === 1) return function (r) { return minify(r, res) }
  if (options.css && res.isCSS()) {
    return transform(res, function (body) {
      try {
        var parsed = css.parse(body.toString())
        body = css.stringify(parsed, {compress: true})
      } catch (ex) {
        //just don't minify
        console.warn(ex.stack)
      }
      return body
    })
  } else if (options.js && res.isJS()) {
    return transform(res, function (body) {
      try {
        body = js(body.toString(), {fromString: true}).code
      } catch (ex) {
        //just don't minify
        console.warn(ex.stack)
      }
      return body
    })
  } else {
    return Q(res)
  }
}