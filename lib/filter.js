var Minimatch = require('minimatch').Minimatch

module.exports = makeFilter
function makeFilter(filter) {
  if (filter == null) return function () { return true }
  if (typeof filter === 'function') return filter
  if (typeof filter === 'string') {
    filter = new Minimatch(filter, {
      dot: true,
      nocase: true,
      nocomment: true
    })
    var res = function (path) { return filter.match(path) }
    res.negate = filter.negate
    return res
  }
  if (Array.isArray(filter) && filter.length != 0) {
    filter = filter.map(makeFilter)
    if (filter.every(function (f) { return f.negate })) {
      return function (path) {
        return filter.every(function (f) { return f(path) })
      }
    } else if (filter.every(function (f) { return !f.negate })) {
      return function (path) {
        return filter.some(function (f) { return f(path) })
      }
    }
  }
  throw new Error('The filter did not match any of the valid patterns')
}