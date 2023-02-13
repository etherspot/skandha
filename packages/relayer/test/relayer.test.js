'use strict';

const bundler = require('..');
const assert = require('assert').strict;

assert.strictEqual(bundler(), 'Hello from bundler');
console.info("bundler tests passed");
