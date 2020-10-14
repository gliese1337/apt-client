'use strict';

const fs = require('fs');
const path = require("path");
const { expect } = require("chai");
const Packages = fs.readFileSync(path.resolve(__dirname, './data/Packages'));
const PackagesGZ = fs.readFileSync(path.resolve(__dirname, './data/Packages.gz'));
const Sources = fs.readFileSync(path.resolve(__dirname, './data/Sources'));
const SourcesGZ = fs.readFileSync(path.resolve(__dirname, './data/Sources.gz'));


const nock = require('nock');

function packages() {
  nock('http://deb.debian.org/').get('/debian/dists/buster/main/binary-all/Packages').reply(200, Packages);
}
function packagesfail() {
  nock('http://deb.debian.org/').get('/debian/dists/buster/main/binary-all/Packages').reply(404);
}
function packagesgz() {
  nock('http://deb.debian.org/').get('/debian/dists/buster/main/binary-all/Packages.gz').reply(200, PackagesGZ);
}
function sources() {
  nock('http://deb.debian.org/').get('/debian/dists/buster/main/source/Sources').reply(200, Sources);
}
function sourcesfail() {
  nock('http://deb.debian.org/').get('/debian/dists/buster/main/source/Sources').reply(404);
}
function sourcesgz() {
  nock('http://deb.debian.org/').get('/debian/dists/buster/main/source/Sources.gz').reply(200, SourcesGZ);
}

const { readAptSource } = require('../dist/aptreader');

describe('read and parse debian repository', () => {
  it('should return binary package info from plaintext index', async function() {
    this.timeout(20000);
    packages();
    const [pkgs, errs] = await readAptSource('deb http://deb.debian.org/debian buster main');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(42752);
    expect(errs.length).to.eql(0);
  });

  it('should return binary package info from plaintext index and raw URL', async function () {
    this.timeout(20000);
    packages();
    const [pkgs, errs] = await readAptSource('http://deb.debian.org/debian/dists/buster/main/binary-all/Packages');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(42752);
    expect(errs.length).to.eql(0);
  });

  it('should return binary package info from gzipped index', async function() {
    this.timeout(20000);
    packagesfail();
    packagesgz();
    const [pkgs, errs] = await readAptSource('deb http://deb.debian.org/debian buster main');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(42702);
    expect(errs.length).to.eql(0);
  });

  it('should return binary package info from gzipped index and raw URL', async function () {
    this.timeout(20000);
    packagesgz();
    const [pkgs, errs] = await readAptSource('http://deb.debian.org/debian/dists/buster/main/binary-all/Packages.gz');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(42702);
    expect(errs.length).to.eql(0);
  });

  it('should return source package info from plaintext index', async function() {
    this.timeout(20000);
    sources();
    const [pkgs, errs] = await readAptSource('deb-src http://deb.debian.org/debian buster main');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(28494);
    expect(errs.length).to.eql(0);
  });

  it('should return source package info from plaintext index and raw URL', async function() {
    this.timeout(20000);
    sources();
    const [pkgs, errs] = await readAptSource('http://deb.debian.org/debian/dists/buster/main/source/Sources');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(28494);
    expect(errs.length).to.eql(0);
  });

  it('should return source package info from gzipped index', async function() {
    this.timeout(20000);
    sourcesfail();
    sourcesgz();
    const [pkgs, errs] = await readAptSource('deb-src http://deb.debian.org/debian buster main');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(28494);
    expect(errs.length).to.eql(0);
  });

  it('should return source package info from gzipped index and raw URL', async function() {
    this.timeout(20000);
    sourcesgz();
    const [pkgs, errs] = await readAptSource('http://deb.debian.org/debian/dists/buster/main/source/Sources.gz');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(28494);
    expect(errs.length).to.eql(0);
  });
});
