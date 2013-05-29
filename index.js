"use strict";

var url = require('url')
var fs = require('fs')
var join = require('path').join
var dirname = require('path').dirname
var Readable = require('stream').Readable || require('readable-stream').Readable

var js = require('uglify-js').minify
var css = require('css')
var throat = require('throat')
var Q = require('q')
var hyperquest = require('hyperquest')
var concatStream = require('concat-stream')
var htmlparser = require('htmlparser')
var mkdir = Q.denodeify(require('mkdirp'))
var Minimatch = require('minimatch').Minimatch

module.exports = fetch
function fetch(site, dir, options, callback) {
  dir = dir.toString()
  if (typeof site === 'number') {
    site = 'http://localhost:' + site
  }
  if (!/^https?:\/\//.test(site)) site = 'http://' + site

  site = url.parse(site, false, true)
  var pathname = site.pathname
  site.pathname = null
  site.search = null
  site.query = null
  site.hash = null
  site = url.format(site)

  if (typeof options === 'function') {
    callback = options
    options = undefined
  }

  options = options || {}
  var filter = makeFilter(options.filter)
  var minifyJS = options.minifyJS || options['minify-js']
  var minifyCSS = options.minifyCSS || options['minify-css']

  var requested = {}
  var inProgress = {}
  var throttle = throat(options.throttle || 4)
  return Q.all([file(pathname), file('/favicon.ico')]).nodeify(callback)
  function file(pth) {
    pth = pth.replace(/(?:#|\?).*$/, '')
    if (!filter(pth)) return Q(null)
    if (requested['key:' + pth.toLowerCase()]) return Q(null)
    requested['key:' + pth.toLowerCase()] = true
    inProgress[pth.toLowerCase()] = true
    return Q(throttle(function () {
      return Q.promise(function (resolve, reject) {
        hyperquest(site + pth, function (err, res) {
          if (err) return reject(err)
          res.body = new Readable()
          res.body.wrap(res)
          return resolve(res)
        })
      })
      .then(function (res) {
        return onResponse(pth, res)
      })
    }))
    .then(function (deps) {
      delete inProgress[pth.toLowerCase()]
      //console.dir(inProgress)
      return Q.all(deps.map(file))
    })
  }
  function onResponse(pth, res) {
    console.log(res.statusCode + ': ' + pth)
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308) {
      if (!res.headers.location) return []
      var location = url.resolve(site + pth, res.headers.location)
      return location.indexOf(site) === 0 ? [location.substr(site.length)] : []
    } else if (res.statusCode != 200) {
      return []
    } else if ((res.headers['content-type'] && res.headers['content-type'].toLowerCase().indexOf('html') >= 0) || 
                (!/\.[^\/]+$/.test(pth) && !res.headers['content-type'])) {
      return concat(res.body)
        .then(function (res) {
          var deps = parseDeps(res.toString())
            .map(function (dep) {
              return url.resolve(site + pth, dep)
            })
            .filter(function (dep) {
              return dep.indexOf(site) === 0
            })
            .map(function (dep) {
              return dep.substr(site.length)
            })
          return writeFile(join(dir, /\.[a-zA-Z]{1,6}/.test(pth) ? pth : pth + '/index.html'), res).thenResolve(deps)
        })
    } else if (res.headers['content-type'] && res.headers['content-type'].toLowerCase().indexOf('css') >= 0) {
      return concat(res.body)
        .then(function (res) {
          var deps = []

          try {
            var parsed = css.parse(res.toString())
            res = css.stringify(parsed, {compress: true})
          } catch (ex) {
            //just don't minify
          }

          return writeFile(join(dir, pth), res).thenResolve(deps)
        })
    } else if (minifyJS && res.headers['content-type'] && res.headers['content-type'].toLowerCase().indexOf('javascript') >= 0) {
      return concat(res.body)
        .then(function (res) {
          var deps = []

          try {
            res = js(res).code
          } catch (ex) {
            //just don't minify
          }

          return writeFile(join(dir, pth), res).thenResolve(deps)
        })
    } else {
      return write(join(dir, pth), res.body).thenResolve([])
    }
  }
}

function parse(domstr) {
  var handler = new htmlparser.DefaultHandler();
  var parser = new htmlparser.Parser(handler);
  parser.parseComplete(domstr);
  return handler.dom;
}
function concat(stream) {
  return Q.promise(function (resolve, reject) {
    stream.pipe(concatStream(function (err, res) {
      if (err) return reject(err)
      else return resolve(res)
    }))
  })
}

function parseDeps(dom) {
  if (typeof dom === 'string') dom = parse(dom)
  if (Array.isArray(dom)) {
    return dom.map(parseDeps).reduce(flatten, [])
  }
  if (typeof dom === 'object') {
    return Object.keys(dom)
      .map(function (attr) {
        if (attr === 'attribs') {
          if (dom[attr].src) return [dom[attr].src]
          if (dom[attr].href) return [dom[attr].href]
          else return []
        } else if (typeof dom[attr] === 'string') {
          return []
        } else {
          return parseDeps(dom[attr])
        }
      })
      .reduce(flatten, [])
  }
  return []

  function flatten(a, b) {
    return a.concat(b)
  }
}

function writeFile(path, content) {
  return mkdir(dirname(path))
    .then(function () {
      return Q.nfcall(fs.writeFile, path, content)
    })
}
function write(path, strm) {
  return mkdir(dirname(path))
    .then(function () {
      var fstrm = strm.pipe(fs.createWriteStream(path))
      return Q.promise(function (resolve, reject) {
        fstrm.on('error', reject)
        strm.on('error', reject)
        fstrm.on('close', resolve)
      })
    })
}

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