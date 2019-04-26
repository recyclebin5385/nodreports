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

exports.lint = jslint
exports.default = gulp.series(jslint, compile)
