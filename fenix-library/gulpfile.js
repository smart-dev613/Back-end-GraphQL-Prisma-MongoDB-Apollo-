const gulp = require('gulp')
const del = require('del') // rm -rf
const babel = require('gulp-babel')
const replace = require('gulp-replace')
const javascriptObfuscator = require('gulp-javascript-obfuscator')


gulp.task('clean', () => {
  return del(['./deploy'])
})

gulp.task('copy-live', () => {
  return gulp.src('./src/fenix.js')
    // .pipe(
    //   babel({
    //     presets: ['@babel/preset-env']
    //   })
    // )
    .pipe(javascriptObfuscator())
    .pipe(gulp.dest('./deploy/global'))
})

gulp.task('copy-staging', () => {
  return gulp.src('./src/fenix.js')
    // .pipe(
    //   babel({
    //     presets: ['@babel/preset-env']
    //   })
    // )
    .pipe(replace('api.synkd.life', 'api-dev.synkd.life'))
    .pipe(replace('my.synkd.life', 'my-dev.synkd.life'))
    .pipe(javascriptObfuscator())
    .pipe(gulp.dest('./deploy/staging'))
})

gulp.task('copy-h5', () => {
  return gulp.src('./src/h5.js')
    .pipe(
      babel({
        presets: ['@babel/preset-env']
      })
    )
    .pipe(javascriptObfuscator())
    .pipe(gulp.dest('./deploy/global'))
})

gulp.task('copy-live-china', () => {
  return gulp.src('./src/fenix.js')
    .pipe(
      babel({
        presets: ['@babel/preset-env']
      })
    )
    .pipe(replace('fenix.byinspired.com', 'api.inspired-mobile.cn'))
    .pipe(javascriptObfuscator())
    .pipe(gulp.dest('./deploy/china'))
})

gulp.task('copy-h5-china', () => {
  return gulp.src('./src/h5.js')
    .pipe(
      babel({
        presets: ['@babel/preset-env']
      })
    )
    .pipe(replace('fenix.byinspired.com', 'api.inspired-mobile.cn'))
    .pipe(javascriptObfuscator())
    .pipe(gulp.dest('./deploy/china'))
})

gulp.task('copy-dev', () => {
  return gulp.src('./src/fenix-dev.js')
    .pipe(
      babel({
        presets: ['@babel/preset-env']
      })
    )
    .pipe(javascriptObfuscator())
    .pipe(gulp.dest('./deploy'))
})


gulp.task('build', gulp.series('clean', 'copy-live', 'copy-staging', 'copy-live-china', 'copy-h5', 'copy-h5-china')) // Add 'copy-dev' to series if doing a dev upload