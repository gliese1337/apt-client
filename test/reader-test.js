'use strict';

const { readAptSource, parseIndex } = require('../dist/aptreader');

describe('read and parse debian repository', () => {  
  it('should return source package info', async function() {
    this.timeout(20000);
    await readAptSource('deb-src http://deb.debian.org/debian buster main contrib non-free');
  });
  
  it('should return binary package info', async function() {
    this.timeout(20000);
    await readAptSource('deb http://deb.debian.org/debian buster main contrib non-free');
  });
});
