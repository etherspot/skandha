'use strict';

const config = require('..');
const assert = require('assert').strict;

assert.strictEqual(config(), 'Hello from config');
console.info("config tests passed");
