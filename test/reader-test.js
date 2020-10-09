'use strict';


const fs = require('fs');
const path = require("path");
const Packages = fs.readFileSync(path.resolve(__dirname, './data/Packages'));
const PackagesGZ = fs.readFileSync(path.resolve(__dirname, './data/Packages.gz'));
const Sources = fs.readFileSync(path.resolve(__dirname, './data/Sources'));
const SourcesGZ = fs.readFileSync(path.resolve(__dirname, './data/Sources.gz'));


const nock = require('nock');
function packages() {
  nock('http://deb.debian.org/', {"encodedQueryParams":true})
    .get('/debian/dists/buster/main/binary-all/Packages')
    .reply(200, Packages);
}

function packagesgz() {
  nock('http://deb.debian.org/', {"encodedQueryParams":true})
    .get('/debian/dists/buster/main/binary-all/Packages')
    .reply(400);

  nock('http://deb.debian.org/', {"encodedQueryParams":true})
    .get('/debian/dists/buster/main/binary-all/Packages.gz')
    .reply(200, PackagesGZ);
}

function sources() {
  nock('http://deb.debian.org/', {"encodedQueryParams":true})
    .get('/debian/dists/buster/main/source/Sources')
    .reply(200, Sources);
}

function sourcesgz() {
  nock('http://deb.debian.org/', {"encodedQueryParams":true})
    .get('/debian/dists/buster/main/source/Sources')
    .reply(400);

  nock('http://deb.debian.org/', {"encodedQueryParams":true})
    .get('/debian/dists/buster/main/source/Sources.gz')
    .reply(200, SourcesGZ);
}

const { readAptSource } = require('../dist/aptreader');

describe('read and parse debian repository', () => {
  afterEach(() => nock.restore());

  it('should return binary package info from plaintext index', async function() {
    this.timeout(20000);
    packages();
    await readAptSource('deb http://deb.debian.org/debian buster main');
  });

  it('should return binary package info from plaintext index and raw URL', async function () {
    this.timeout(20000);
    packages();
    await readAptSource('http://deb.debian.org/debian/dists/buster/main/binary-all/Packages');
  });

  it('should return binary package info from gzipped index', async function() {
    this.timeout(20000);
    packagesgz();
    await readAptSource('deb http://deb.debian.org/debian buster main');
  });

  it('should return source package info from plaintext index', async function() {
    this.timeout(20000);
    sources();
    await readAptSource('deb-src http://deb.debian.org/debian buster main');
  });

  it('should return source package info from gzipped index', async function() {
    this.timeout(20000);
    sourcesgz();
    await readAptSource('deb-src http://deb.debian.org/debian buster main');
  });
});
