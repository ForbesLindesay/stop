var dirname = require('path').dirname
var fs = require('fs')

var Q = require('q')
var mkdir = Q.denodeify(require('mkdirp'))
var writeFile = Q.denodeify(fs.writeFile)

module.exports = write
function write(path, content) {
  return mkdir(dirname(path))
    .then(function () {
      if (typeof content.pipe === 'function') {
        return Q.promise(function (resolve, reject) {
          var fstrm = content.pipe(fs.createWriteStream(path))
          fstrm.on('error', reject)
          content.on('error', reject)
          fstrm.on('close', resolve)
        })
      } else {
        return writeFile(path, content)
      }
    })
}