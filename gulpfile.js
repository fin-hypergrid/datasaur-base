'use strict';

var gulp = require('gulp'),
    manifest = require('./package.json'),
    make = require('fin-hypergrid-client-module-maker');

make(gulp, {
    name: manifest.name,
    version: manifest.version,
    tasks: ['lint', 'build']
});
