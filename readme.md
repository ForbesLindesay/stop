# Stop

Make a dynamic website static by downloading it.

## Installation

```
$ npm install stop
```

## Example Usage

```js
var stop = require('stop');

getWebsiteStream('http://example.com', {
  filter: function (currentURL) {
    return url.parse(currentURL).hostname === 'example.com';
  },
  parallel: 1
})
.syphon(exports.addFavicon())
.syphon(exports.addManifest('/app.manifest', {addLinks: true}))
.syphon(exports.writeFileSystem(__dirname + '/output'))
.wait().done(function () {
  console.log('success');
});
```

### stop(source, destination, options, callback)

 - `source` can be a domain name (e.g. `example.com`) a url (e.g. `http://example.com` or `http://example.com/foo`) or a port name (e.g. `3000` is equivalent to `http://localhost:3000`)
 - `destination` is a path name, if it's relative it will be relative to the current working directory
 - `options` can be ommitted if the defaults are being used
   - `filter` exclude some URLs from the download
   - `minify-js` or `minifyJS` set to `true` to minify all downloaded JavaScript
   - `minify-css` or `minifyCSS` set to `true` to minify all downloaded CSS
   - `throttle` (defaults to `4`) the number of parallel downloads permitted
 - `callback` optional callback, if it's ommitted, a promise is returned instead

## License

  MIT

  If you find it useful, a payment via [gittip](https://www.gittip.com/ForbesLindesay) would be appreciated.