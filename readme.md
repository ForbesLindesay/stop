# Stop

Make a dynamic website static by downloading it.

## Installation

```
$ npm install stop
```

## Example Usage

```js
var url = require('url');
var stop = require('stop');

stop.getWebsiteStream('http://example.com', {
  filter: function (currentURL) {
    return url.parse(currentURL).hostname === 'example.com';
  },
  parallel: 1
})
.syphon(stop.addFavicon())
.syphon(stop.addManifest('/app.manifest', {addLinks: true}))
.syphon(stop.minifyJS())
.syphon(stop.minifyCSS({deadCode: true}))
.syphon(stop.log())
.syphon(stop.checkStatusCodes([200]))
.syphon(stop.writeFileSystem(__dirname + '/output'))
.wait().done(function () {
  console.log('success');
});
```

## License

  MIT

  If you find it useful, a payment via [gittip](https://www.gittip.com/ForbesLindesay) would be appreciated.
