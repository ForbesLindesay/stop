"use strict";

var url = require('url')
var join = require('path').join

var throat = require('throat')
var Promise = require('promise')

var request = require('./lib/request')
var detect = require('./lib/deps')
var makeFilter = require('./lib/filter')
var minify = require('./lib/minify')
var write = require('./lib/write')

module.exports = fetch
function fetch(site, dir, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = undefined
  }

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


  options = options || {}
  var filter = makeFilter(options.filter)
  var minifyJS = options.minifyJS || options['minify-js']
  var minifyCSS = options.minifyCSS || options['minify-css']

  var requested = {}
  var inProgress = {}

  var getFile = throat(options.throttle || 4, function (pth) {
    return request(site + pth)
      .then(detect)
      .then(minify({css: minifyCSS, js: minifyJS}))
      .then(function (res) {
        console.log(res.statusCode + ': ' + pth)
        var deps = res.dependencies
          .map(function (dep) {
            return url.resolve(site + pth, dep)
          })
          .filter(function (dep) {
            return dep.indexOf(site) === 0
          })
          .map(function (dep) {
            return dep.substr(site.length)
          })
        if (res.statusCode != 200) {
          return deps
        } else {
          if (res.isHTML() && !/\.[a-zA-Z]{1,6}/.test(pth)) pth += '/index.html'
          return write(join(dir, pth), res.body).thenResolve(deps)
        }
      })
  })

  function recurse(pth) {
    pth = pth.replace(/(?:#|\?).*$/, '')
    if (!filter(pth)) return Promise.from(null)
    if (requested['key:' + pth.toLowerCase()]) return Promise.from(null)
    requested['key:' + pth.toLowerCase()] = true
    inProgress[pth.toLowerCase()] = true
    return getFile(pth)
    .then(function (deps) {
      delete inProgress[pth.toLowerCase()]
      //console.dir(inProgress)
      return Promise.all(deps.map(file))
    })
  }

  return Promise.all(recurse(pathname), recurse('/favicon.ico')).nodeify(callback)
}