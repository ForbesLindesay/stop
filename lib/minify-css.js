'use strict';

var util = require('util');
var barrage = require('barrage');
var css = require('css');
var CleanCSS = require('clean-css');
var cheerio = require('cheerio');
var chalk = require('chalk');
var prettyBytes = require('pretty-bytes');
var figures = require('figures');
var arrow = ' ' + figures.arrowRight + ' ';

function cleanCSS(css) {
  return new CleanCSS().minify(css).styles;
}

function formatSize(size, tag) {
  return chalk.green(prettyBytes(size)) + ' ' + chalk.gray('(' + tag + ')');
}
module.exports = eliminateDeadStyles;
function eliminateDeadStyles(options) {
  options = options || {};
  if (!options.deadCode) {
    var stream = new barrage.Transform({objectMode: true});
    stream._transform = function (page, _, cb) {
      if (page.headers['content-type'].indexOf('text/css') !== -1 && (!options.filter || options.filter(page.url))) {
        var before = page.body.length;
        var minified = cleanCSS(page.body.toString());
        page.body = new Buffer(minified);
        var after = page.body.length;
        if (!options.silent) {
          console.log(chalk.blue('minfing ') + page.url);
          console.log(formatSize(before, 'source') + arrow + formatSize(after, 'minify'));
        }
      }
      stream.push(page);
      cb();
    };
    return stream;
  }
  var html = [];
  var styles = [];
  var stream = new barrage.Transform({objectMode: true});
  stream._transform = function (page, _, cb) {
    if (page.headers['content-type'].indexOf('text/css') !== -1 && (!options.filter || options.filter(page.url))) {
      styles.push(page);
    } else {
      stream.push(page);
    }
    if (page.headers['content-type'].indexOf('text/html') != -1) {
      html.push(page);
    }
    cb();
  };
  stream._flush = function (cb) {
    styles.forEach(function (style) {
      var before = style.body.length;
      var eliminator = new DeadStyleEliminator(style.body.toString('utf8'), options);
      html.forEach(function (page) {
        eliminator.add(page.body.toString('utf8'));
      });
      var removed = [];
      var minified = eliminator.toString(removed);
      var afterDeadCode = (new Buffer(minified)).length;
      minified = cleanCSS(minified);
      style.body = new Buffer(minified);
      var afterMinify = style.body.length;
      if (!options.silent) {
        console.log(chalk.blue('minfing ') + style.url);
        removed.forEach(function (selector) {
          console.log(chalk.yellow('WARN:') + ' Removing unused selector ' + util.inspect(selector));
        });
        console.log(formatSize(before, 'source') + arrow +
                    formatSize(afterDeadCode, 'dead code elimination') + arrow +
                    formatSize(afterMinify, 'minify'));
      }
      stream.push(style);
    });
    cb();
  };
  return stream;
}
function DeadStyleEliminator(src, options) {
  this.ast = css.parse(src);
  var selectors = this.selectors = [];
  var rules = this.rules = {};
  function walk(node) {
    if (node.type === 'stylesheet') {
      node.stylesheet.rules.forEach(walk);
    } else if (node.type === 'media') {
      node.rules.forEach(walk);
    } else if (node.type === 'rule') {
      var selector = node.selectors.map(function (selector) {
        return selector.split(':')[0];
      }).join(', ');
      if (options && options.ignore && options.ignore.some(function (ignore) {
        return selector.indexOf(ignore) !== -1;
      })) {
        return;
      }
      if (selectors.indexOf(selector) === -1) {
        selectors.push(selector);
        rules[selector] = [];
      }
      rules[selector].push(node);
    }
  }
  walk(this.ast);
}
DeadStyleEliminator.prototype.add = function (html) {
  var $ = cheerio.load(html);
  this.selectors = this.selectors.filter(function (selector) {
    try {
      return $(selector).length === 0;
    } catch (ex) {
      return false;
    }
  });
};
DeadStyleEliminator.prototype.toString = function (removed) {
  this.selectors.forEach(function (selector) {
    this.rules[selector].forEach(function (rule) {
      if (removed && removed.indexOf(rule.selectors.join(', ')) === -1) {
        removed.push(rule.selectors.join(', '));
      }
      if (rule.parent.type === 'stylesheet') {
        rule.parent.stylesheet.rules.splice(rule.parent.stylesheet.rules.indexOf(rule), 1);
      } else if (rule.parent.type === 'media') {
        rule.parent.rules.splice(rule.parent.rules.indexOf(rule), 1);
      } else {
        console.dir(rule.parent);
      }
    });
  }.bind(this));
  return css.stringify(this.ast);
};
