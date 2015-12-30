/**
 * Web Care-Package
 * Copyright 2015 Santiago Serna. Todos los derechos reservados.
 */

// Requeridos
var gulp = require('gulp');
var gutil = require('gulp-util');
var eslint = require('gulp-eslint');
var postcss = require('gulp-postcss');
var cssnano = require('gulp-cssnano');
var autoprefixer = require('autoprefixer');
var rucksack = require('rucksack-css');
var lost = require('lost');
var sourcemaps = require('gulp-sourcemaps');
var stylus = require('gulp-stylus');
var jade = require('gulp-jade');
var htmlmin = require('gulp-htmlmin');
var plumber = require('gulp-plumber');
var browserify = require('browserify');
var babelify = require("babelify");
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var smoosher = require('gulp-smoosher');
var imagemin = require('gulp-imagemin');
var size = require('gulp-size');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

/** 
 * Por defecto el Care-Package cuenta con una estructura de proyecto estandar,
 * las rutas para los archivos que seran procesados se almacenan en la variable
 * config. Si desea usar una estructura de proyecto diferente es necesario
 * modificar las rutas de los archivos de la variable config segun la estructura
 * de su proyecto (se recomienda usar la estructura estandar).
 */


/**
 * IMPORTANTE: El Care-Package usa Jade como motor de templates y pre-procesador
 * de HTML y PostCSS junto con Stylus como pre-procesador de CSS.
 */

// Config directories: objeto que contiene las rutas de entrada y salida para
// los archivos del proyecto.
var config = {
  html: {
    main: './src/*.jade',
    output: './build',
    watch: './src/index.jade'
  },
  styles: {
    main: './src/styles/main.styl',
    output: './build/css',
    watch: './src/styles/**/*.styl'
  },
  scripts: {
    main: './src/scripts/main.js',
    lint: './src/scripts/**/*.js',
    output: './build/js',
    watch: './src/scripts/**/*.js'
  },
  images: {
    output: './dist/img',
    watch: ['./build/res/**/*.png', './build/res/**/*.jpg']
  }
}

// Lint JavaScript: lee el codigo JS y verifica si tiene errores.
gulp.task('lint', function() {
  gulp.src([config.scripts.lint])
  .pipe(eslint({
    'rules': {
      'no-alert': 0,
      'camelcase': 1,
      'curly': 1,
      'eqeqeq': 0,
      'no-empty': 1,
      'no-use-before-define': 0,
      'no-obj-calls': 2,
      'no-unused-vars': 0,
      'semi': 1,
      'quotes': 0
    },
    'globals': {
      '$': false
    }
  }))
  .pipe(eslint.format())
  .pipe(eslint.failOnError());
});

// Image task: optimizar imagenes.
gulp.task('images', function() {
  gulp.src(config.images.watch)
  .pipe(imagemin({
    optimizationLevel: 5,
    progressive: true,
    interlaced: true
  }))
  .pipe(gulp.dest(config.images.output))
  .pipe(size({title: 'images'}));
});

// HTML task: compilar los templates.
gulp.task('build:html', function(){
  gulp.src([config.html.main])
  .pipe(plumber())
  .pipe(jade({
    pretty: true
  }))
  .pipe(gulp.dest(config.html.output))
  .pipe(reload({stream:true}));
});

/**
 * El Care-Package utiliza postcss para transformar el codigo CSS, la variable
 * processors almacena los plugins que se pueden usar con postcss, si desea
 * agregar mas plugins consulte la documentacion sobre su uso:
 * https://github.com/postcss/postcss
 */

// CSS task: compilar y poner prefijos automaticamente a las hojas de estilo.
gulp.task('build:css', function() {
  // Variable que contiene un arreglo con los plugins a usarse en postcss.
  var processors = [
    // Prefijos para las propiedades de CSS que lo necesiten.
    autoprefixer,
    // Un plugin que contiene muchas utilidades CSS, consultar documentación:
    // http://simplaio.github.io/rucksack/docs/
    rucksack,
    // Grid System, documentación: https://github.com/peterramsing/lost
    lost
  ];
  // Variable que contiene un arreglo con los navegadores a los que se les
  // quiere dar soporte en el proyecto.
  var browsers = [
    'ie >= 10',
    'ie_mob >=10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
  ];

  gulp.src(config.styles.main)
    // Usar sintaxis de Stylus (opcional).
    .pipe(stylus({
      'include css': true
    }))
    .pipe(sourcemaps.init())
    .pipe(postcss(processors))
    // Minify styles.
    .pipe(cssnano())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(config.styles.output))
    .pipe(reload({stream:true}));
});

/**
 * El Care-Package hace uso de browserify para gestionar dependencias en forma
 * de módulos y concatenar todo el código JS en un solo archivo. El uso de la 
 * sintaxis ES2015 (ECMAScript 6) es opcional, si desea hacer uso de la
 * sintaxis descomentar la linea '.transform(babelify)'
 */

// Scripts task: procesar codigo JS.
gulp.task('build:js', function() {
  return browserify(config.scripts.main)
    //.transform(babelify)
    .bundle()
    .on('error', function(e){
      gutil.log(e);
    })
    .pipe(source('bundle.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(config.scripts.output));
});

/**
 * El Care-Package construye un directorio final en donde se encuentra una
 * carpeta con todas las imágenes y los assets de la pagina junto con el 
 * index.html en donde se encuentra anidado y minificado el código CSS y JS.
 */

// Inline task: anidar el CSS y el JS dentro del archivo html y finalmente
// minificar todo el archivo HTML.
gulp.task('inline', function() {
  gulp.src('./build/index.html')
    .pipe(smoosher())
    .pipe(htmlmin({
      removeComments: true,
      collapseWhitespace: true
    }))
    .pipe(gulp.dest('./dist'));
});

// Copiar los archivos extras al directorio de produccion (dist).
gulp.task('copy:mainFiles', function() {
  return gulp.src([
      './build/humans.txt',
      './build/robots.txt',
      './build/manifest.json',
      './build/manifest.webapp'
    ])
    .pipe(gulp.dest('./dist'))
});

// Borrar directorio de produccion (dist).
gulp.task('clean:build', function() {
  del(['./dist/**/*']);
});

// Browser-sync task: estar atento a los cambios en los archivos refrescar el
// navegador. Crea un servidor estático en el directorio temporal.
gulp.task('browser-sync', function(){
  browserSync({
    server:{
      baseDir: "./build"
    },
    notify: false,
    // Personaliza el prefijo de registro de la consola Browsersync.
    logPrefix: 'Web Care-Package',
    // Previene el navegador de abrirse automáticamente.
    open: false,
    port: 3000
  });
});

// Final app server task: Crea un servidor estático en el directorio de producción.
gulp.task('build:serve', function(){
  browserSync({
    server:{
      baseDir: "./dist/"
    }
  });
});

// Watch task: estar atento a los cambios en los archivos.
gulp.task('watch', function() {
  gulp.watch(config.html.watch, ['build:html']);
  gulp.watch(config.styles.watch, ['build:css']);
  gulp.watch(config.scripts.watch, ['lint', 'build:js']);
  gulp.watch(config.images.watch, ['images']);
});

// Build task: Construir archivos de producción.
gulp.task('build', ['build:html', 'build:css', 'build:js', 'images', 'inline', 'copy:mainFiles']);

// Default task
gulp.task('default', ['browser-sync', 'watch']);