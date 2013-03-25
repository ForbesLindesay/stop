# Stop

  Simplified express for static websites.

  `Stop` offers an API similar to express and is compatible with express middleware, but can automatically generate a static version of any website.

## Example

```javascript
var Stop = require('stop');

//if `isStatic` is true, it will be compiled statically
//if `isStatic` is false, it will be hosted for development
var app = new Stop(isStatic);

//exactly like route middleware
//when static will become `/foo/index.html`
app.get('/foo', function (req, res, next) {
  res.send('bar');
});

//serve directory `/public` at route `/`
app.directory('/', __dirname + '/public');

//Compatible with all the route middleware you'd expect
//Plus `isStatic = true` automatically sets `NODE_ENV` to
//production, so you often get automatic minification etc.
app.get('/client.js', require('browserify-middleware')('./client.js'))

//pass output directory (used if static) and port number (used if dynamic)
app.run('./out', 3000);
```

## API

## new Stop(isStatic)

Must be called as a constructor.  The `isStatic` property determines 

### Stop#get(path, middleware...)

Define a custom route from `path` to `middleware`.  You can have any code you like in middlware, which is where the real power of `Stop` comes form.

Paths for "directories" will become "index.html" when compiled statically.

### Stop#favicon(filepath)

Use the favicon at `filepath` to respond to all requests for `/favicon.ico`

### Stop#file(path, filepath)

Serve the file at `filepath` for all requests for `path`.

### Stop#directory(path, filepath)

Serve the files in the directory `filepath` for requests for `path/*`.

### Stop#run(path, port)

Port is optional and a default one will be used if left out.  This either compiles the server statically or runs it dynamically.  It also sets `NODE_ENV` to `production` if true, so that anything that supports automated minification knows to enable it.

## License

  MIT


  If you find it useful, a payment via [gittip](https://www.gittip.com/ForbesLindesay) would be appreciated.

![viewcount](https://viewcount.jepso.com/count/ForbesLindesay/stop.png)