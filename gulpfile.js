const gulp = require('gulp')
const plugins = require('gulp-load-plugins')()

function jslint () {
  return gulp.src(['./*.js', 'src/**/*.js'])
    .pipe(plugins.eslint({
      useEslintrc: true
    }))
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError())
}

function compile () {
  return gulp.src('src/**/*.js')
    .pipe(gulp.dest('dist'))
}

function jsdoc () {
  return gulp.src(['README.md', 'LICENSE.txt', './dist/**/*.js'], { read: false })
    .pipe(plugins.jsdoc3())
}

exports.lint = jslint
exports.doc = jsdoc
exports.default = gulp.series(jslint, compile, jsdoc)
