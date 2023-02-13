'use strict';

const p2p = require('..');
const assert = require('assert').strict;

assert.strictEqual(p2p(), 'Hello from p2p');
console.info("p2p tests passed");
