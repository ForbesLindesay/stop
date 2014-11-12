'use strict';

var url = require('url');
var fs = require('fs');
var stop = require('./');

stop.getWebsiteStream('https://www.promisejs.org', {
  filter: function (currentURL) {
    return url.parse(currentURL).hostname === 'www.promisejs.org';
  },
  parallel: 1
})
.syphon(stop.addFavicon())
.syphon(stop.log())
.syphon(stop.minifyCSS({deadCode: true}))
.syphon(stop.minifyJS())
.syphon(stop.checkStatusCodes([200, 302]))
.syphon(stop.writeFileSystem(__dirname + '/out'))
.wait().done(function () {
  console.log('success');
});
