'use strict';

// must add <link href="/app.manifest" rel="manifest"/> to every html header


var url = require('url');
var crypto = require('crypto');
var Transform = require('barrage').Transform;

module.exports = addManifest;

/**
 * Add cache manifest files to the stream.
 *
 * Options:
 *
 *  - justManifests - set to `true` to only emit the manifest files.
 *  - addLinks - set to `true` to add <link href="/app.manifest" rel="manifest"/> to each html page.
 *
 * @param {String} file
 * @param {Ojbect} options
 * @returns {TransformStream}
 */
function addManifest(file, options) {
  file = file || '/app.manifest';
  var stream = new Transform({objectMode: true});

  var domains = {};
  var hostProtocols = {};
  stream._transform = function (page, _, callback) {
    if (!(options && options.justManifests)) {
      if (page.statusCode !== 404 || url.resolve(page.url, file) !== page.url) {
        if (page.statusCode === 200 &&
            page.headers['content-type'] &&
            page.headers['content-type'].indexOf('text/html') !== -1 &&
            options && options.addLinks) {
          var body = page.body.toString();
          var link = '<link href="' + file + '" rel="manifest"/>';
          page.body = new Buffer(body.replace(/<\/head>/, link + '</head>'));
        }
        this.push(page);
      }
    }
    if (page.statusCode === 200) {
      var host = url.parse(page.url).host;
      var protocol = hostProtocols[host] || (hostProtocols[host] = url.parse(page.url).protocol);
      var domain = protocol + '//' + host;
      domain = domains[domain] || (domains[domain] = {hash: crypto.createHash('sha512'), urls: []});
      domain.hash.update(page.statusCode + ' - ' + page.url);
      domain.hash.update(page.body || '');
      domain.urls.push(page.url);
    }
    callback(null);
  };
  stream._flush = function (callback) {
    Object.keys(domains).forEach(function (domain) {
      stream.push({
        statusCode: 200,
        url: url.resolve(domain, file),
        headers: {},
        body: new Buffer('CACHE MANIFEST\n\n# hash: ' +
                         domains[domain].hash.digest('base64') + '\n\n' +
                         domains[domain].urls.map(function (u) {
                           return url.parse(u).pathname;
                         }).join('\n') + '\n'),
        dependencies: domains[domain].urls
      });
    });
    callback();
  };
  
  return stream;
}
