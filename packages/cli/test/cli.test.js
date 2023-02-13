'use strict';

const cli = require('..');
const assert = require('assert').strict;

assert.strictEqual(cli(), 'Hello from cli');
console.info("cli tests passed");
