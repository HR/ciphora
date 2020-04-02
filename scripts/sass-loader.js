const path = require('path'),
  glob = require('glob')

module.exports = {
  loader: 'sass-loader',
  options: {
    sassOptions: loaderContext => {
      const { resourcePath, rootContext } = loaderContext
      const dir = path.dirname(resourcePath)
      return {
        indentWidth: 4,
        webpackImporter: false,
        includePaths: ['static/scss'],
        importer: function (url, prev, done) {
          // Add support for sass @import globs
          const absUrl = path.join(dir, url)
          globs = absUrl.includes('*') && glob.sync(absUrl)

          if (globs) {
            const contents = globs
              .map(p => `@import '${p.replace(dir + path.sep, '')}';`)
              .join('\n')

            return { contents }
          }

          return null
        }
      }
    }
  }
}
