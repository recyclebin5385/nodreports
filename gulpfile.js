const gulp = require('gulp')
const plugins = require('gulp-load-plugins')()
const del = require('del')

function clean () {
  return del(['dist', 'docs/gen', 'tmp'])
}

function jslint () {
  return gulp.src(['./*.js', 'src/**/*.js', 'test/**/*.js'])
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
  return gulp.src(['README.md', './dist/**/*.js'], { read: false })
    .pipe(plugins.jsdoc3())
}

function test () {
  return gulp.src('test/**/*.js', { read: false })
    .pipe(plugins.mocha({ reporter: 'list', timeout: 60000 }))
}

exports.clean = clean
exports.lint = jslint
exports.doc = jsdoc
exports.test = test
exports.default = gulp.series(jslint, compile, jsdoc, test)
