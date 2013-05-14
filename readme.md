# Stop

  Make a dynamic website static by downloading it.

## Command Line

### Installation

```
$ npm install stop -g
```

### Usage

```
stop <source> <destination> [options]
```

Source can be a url, a port number (treated as `http://localhost:<source>`), a domain name (treated as `http://<source>`) or a path to a node.js app that, when started, will listen on a port.

```
$ stop --help

Usage: stop <source> <destination> [options]

Options:
  --help, -h                Display usage information.                                  [boolean]
  --minify-js, -j           Minify JavaScript using UglifyJS                            [boolean]
  --minify-css, -c          Minify CSS using css-parse and css-stringify                [boolean]
  --throttle, -t            The number of concurrent download to permit                 [default: 4]
  --filter, --grep, -f, -g  Filter the paths to be downloaded using glob style strings  [string]

$ stop example.com ./example.com --minify-js --minify-css
$ stop 3000 ./localhost-3000 --minify-js --minify-css
$ stop server.js ./sample-app --minify-js --minify-css
```

### Configuration

To save you typing in the command line options every time, `stop` accepts [toml](https://github.com/mojombo/toml) configuration files in the location `.stop.toml`.  An example configuration file might look like:

.stop.toml

```toml
source="./server.js"
destination="./static"

[options]
minify-js=true
minify-css=true
throttle=10
filter=["!/temp/**", "!/.git/**"]
```

## API

### Installation

```
$ npm install stop
```

### Example Usage

```js
var stop = require('stop')
var options = {}
stop('http://example.com', __dirname + '/static', options, function (err) {
  console.log('done')
})
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