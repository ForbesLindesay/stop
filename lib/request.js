"use strict"

var Readable = require('stream').Readable || require('readable-stream').Readable

var Q = require('q')
var hyperquest = require('hyperquest')

module.exports = request
function request(url) {
  return Q.promise(function (resolve, reject) {
    hyperquest(url, function (err, res) {
      if (err) return reject(err)
      res.url = url
      res.body = new Readable()
      res.body.wrap(res)

      res.isRedirect = isRedirect
      res.isHTML = isHTML
      res.isCSS = isCSS
      res.isJS = isJS

      if (res.statusCode >= 400) {
        var err = new Error('Recieved response code ' + res.statusCode + ' for ' + url)
        err.code = res.statusCode
        err.res = res
        reject(err)
      }
      return resolve(res)
    })
  })
}

function isRedirect() {
  return this.statusCode === 301 || this.statusCode === 302 || this.statusCode === 303 || this.statusCode === 307 || this.statusCode === 308
}
function isHTML() {
  return (this.headers['content-type'] && this.headers['content-type'].toLowerCase().indexOf('html') >= 0)
      || (!/\.[^\/]+$/.test(this.url) && !this.headers['content-type'])
      || (/\.html?$/i.test(this.url) && !this.headers['content-type'])
}
function isCSS() {
  return this.headers['content-type'] && this.headers['content-type'].toLowerCase().indexOf('css') >= 0
}
function isJS() {
  return this.headers['content-type'] && this.headers['content-type'].toLowerCase().indexOf('javascript') >= 0
}