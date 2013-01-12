var fs = require('fs');
var resolve = require('path').resolve;
var connect = require('connect');
var build = require('then-build');
(function () {
  var oldJade = build.jade;
  function jade(path, options) {
    try {
      var jade = require('then-jade');
      return jade.renderFile(path, options);
    } catch (ex) {
      return oldJade(path, options);
    }
  }
  jade.render = render;
  function render(path, options) {
    try {
      var jade = require('then-jade');
      return jade.render(path, options);
    } catch (ex) {
      return oldJade.render(path, options);
    }
  }
  build.jade = jade;
}());

exports.getServer = getServer;
function getServer(directory) {
  var app = connect();

  app//.use(connect.logger())
     .use(simpleCompilation)
     .use(connect.static(directory))
     .use(connect.directory(directory));
  function simpleCompilation(req, res, next) {
    var extension, builder;
    var path = require('url').parse(req.url).pathname;
    console.log(path);
    if (path[path.length-1] !== '/' && (extension = /\.([^\.]+)$/.exec(path)) && (builder = build[extension[1]]) && fs.existsSync(resolve(directory, '.' + path))) {
      builder(resolve(directory, '.' + path), {})
        .then(function (data) {
          res.end(data);
        }, next)
    } else {
      next();
    }
  }
  return app;
}