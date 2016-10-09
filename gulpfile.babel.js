//-------------------------------------------------------------------------------
// Imports
//-------------------------------------------------------------------------------

import gulp from 'gulp'
import babel from 'gulp-babel'
import eslint from 'gulp-eslint'
import mocha from 'gulp-mocha'
import sourcemaps from 'gulp-sourcemaps'
import util from 'gulp-util'
import del from 'del'
import babelRegister from 'babel-core/register'
import path from 'path'


//-------------------------------------------------------------------------------
// Gulp Properties
//-------------------------------------------------------------------------------

const sources = {
  babel: [
    'src/**',
    '!**/tests/**'
  ],
  lint: [
    '**/*.js',
    '!node_modules/**',
    '!dist/**'
  ],
  tests: [
    '**/__tests__/*.js',
    '!node_modules/**',
    '!dist/**'
  ]
}


//-------------------------------------------------------------------------------
// Gulp Tasks
//-------------------------------------------------------------------------------

gulp.task('default', ['prod'])

gulp.task('prod', ['babel'])

gulp.task('dev', ['babel', 'lint', 'babel-watch', 'lint-watch'])

gulp.task('test', ['lint', 'mocha'])

gulp.task('babel', function() {
  return gulp.src(sources.babel)
    .pipe(sourcemaps.init({
      loadMaps: true
    }))
    .pipe(babel({
      presets: ['es2015', 'stage-1', 'stage-2'],
      plugins: ['transform-decorators-legacy']
    }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist'))
    .on('error', (error) => {
      util.log(error)
    })
})

gulp.task('lint', () => {
  return gulp.src(sources.lint)
  .pipe(eslint())
  .pipe(eslint.formatEach())
  .pipe(eslint.failOnError())
  .on('error', (error) => {
    util.log('Stream Exiting With Error', error)
  })
})

gulp.task('mocha', () => {
  return gulp.src(sources.tests)
  .pipe(mocha({
    compilers: {
      js: babelRegister
    }
  }))
})

gulp.task('clean', () => {
  return del([
    'dist'
  ])
})

gulp.task('cleanse', ['clean'], () => {
  return del([
    'node_modules'
  ])
})


//-------------------------------------------------------------------------------
// Gulp Watchers
//-------------------------------------------------------------------------------

gulp.task('babel-watch', () => {
  const sourceMapsInit = sourcemaps.init({
    loadMaps: true
  })
  const sourceMapsWrite = sourcemaps.write('./')
  const babelPipe = babel({
    presets: ['es2015', 'stage-1', 'stage-2'],
    plugins: ['transform-decorators-legacy']
  })
  const dest = gulp.dest('./dist')
  gulp.watch(sources.babel, (event) => {
    if (event.type !== 'deleted') {
      gulp.src(event.path)
        .pipe(sourceMapsInit, {end: false})
        .pipe(babelPipe, {end: false})
        .pipe(sourceMapsWrite, {end: false})
        .pipe(dest, {end: false})
        .on('error', (error) => {
          util.log(error)
        })
    } else {
      del([path.resolve('dist', event.relative)])
    }
  })
})

gulp.task('lint-watch', () => {
  const lintAndPrint = eslint()
  lintAndPrint.pipe(eslint.formatEach())

  return gulp.watch(sources.lint, (event) => {
    if (event.type !== 'deleted') {
      gulp.src(event.path)
        .pipe(lintAndPrint, {end: false})
        .on('error', (error) => {
          util.log(error)
        })
    }
  })
})
