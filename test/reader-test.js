'use strict';

const fs = require('fs');
const path = require("path");
const { expect } = require("chai");

const debPackages   = fs.readFileSync(path.resolve(__dirname, './data/debian/Packages'));
const debPackagesGZ = fs.readFileSync(path.resolve(__dirname, './data/debian/Packages.gz'));
const debSources    = fs.readFileSync(path.resolve(__dirname, './data/debian/Sources'));
const debSourcesGZ  = fs.readFileSync(path.resolve(__dirname, './data/debian/Sources.gz'));

const rpiPackages   = fs.readFileSync(path.resolve(__dirname, './data/rpi/Packages'));
const rpiPackagesGZ = fs.readFileSync(path.resolve(__dirname, './data/rpi/Packages.gz'));

const nock = require('nock');

function debpackages() {
  nock('http://deb.debian.org/').get('/debian/dists/buster/main/binary-all/Packages').reply(200, debPackages);
}
function debpackagesfail() {
  nock('http://deb.debian.org/').get('/debian/dists/buster/main/binary-all/Packages').reply(404);
}
function debpackagesgz() {
  nock('http://deb.debian.org/').get('/debian/dists/buster/main/binary-all/Packages.gz').reply(200, debPackagesGZ);
}
function debsources() {
  nock('http://deb.debian.org/').get('/debian/dists/buster/main/source/Sources').reply(200, debSources);
}
function debsourcesfail() {
  nock('http://deb.debian.org/').get('/debian/dists/buster/main/source/Sources').reply(404);
}
function debsourcesgz() {
  nock('http://deb.debian.org/').get('/debian/dists/buster/main/source/Sources.gz').reply(200, debSourcesGZ);
}

function rpipackages() {
  nock('http://archive.raspberrypi.org/').get('/debian//dists/buster/main/binary-armhf/Packages').reply(200, rpiPackages);
}
function rpipackagesgz() {
  nock('http://archive.raspberrypi.org/').get('/debian//dists/buster/main/binary-armhf/Packages.gz').reply(200, rpiPackagesGZ);
}

const { readAptSource } = require('../dist/aptreader');

describe('read and parse debian repository', () => {
  it('should return binary package info from plaintext index', async function() {
    this.timeout(20000);
    debpackages();
    const [pkgs, errs] = await readAptSource('deb http://deb.debian.org/debian buster main');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(42752);
    expect(errs.length).to.eql(0);
  });

  it('should return binary package info from plaintext index and raw URL', async function () {
    this.timeout(20000);
    debpackages();
    const [pkgs, errs] = await readAptSource('http://deb.debian.org/debian/dists/buster/main/binary-all/Packages');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(42752);
    expect(errs.length).to.eql(0);
  });

  it('should return binary package info from gzipped index', async function() {
    this.timeout(20000);
    debpackagesfail();
    debpackagesgz();
    const [pkgs, errs] = await readAptSource('deb http://deb.debian.org/debian buster main');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(42702);
    expect(errs.length).to.eql(0);
  });

  it('should return binary package info from gzipped index and raw URL', async function () {
    this.timeout(20000);
    debpackagesgz();
    const [pkgs, errs] = await readAptSource('http://deb.debian.org/debian/dists/buster/main/binary-all/Packages.gz');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(42702);
    expect(errs.length).to.eql(0);
  });

  it('should return source package info from plaintext index', async function() {
    this.timeout(20000);
    debsources();
    const [pkgs, errs] = await readAptSource('deb-src http://deb.debian.org/debian buster main');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(28494);
    expect(errs.length).to.eql(0);
  });

  it('should return source package info from plaintext index and raw URL', async function() {
    this.timeout(20000);
    debsources();
    const [pkgs, errs] = await readAptSource('http://deb.debian.org/debian/dists/buster/main/source/Sources');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(28494);
    expect(errs.length).to.eql(0);
  });

  it('should return source package info from gzipped index', async function() {
    this.timeout(20000);
    debsourcesfail();
    debsourcesgz();
    const [pkgs, errs] = await readAptSource('deb-src http://deb.debian.org/debian buster main');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(28494);
    expect(errs.length).to.eql(0);
  });

  it('should return source package info from gzipped index and raw URL', async function() {
    this.timeout(20000);
    debsourcesgz();
    const [pkgs, errs] = await readAptSource('http://deb.debian.org/debian/dists/buster/main/source/Sources.gz');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(28494);
    expect(errs.length).to.eql(0);
  });
});

describe('read and parse raspbian repository', () => {
  it('should return binary package info from plaintext index and raw URL', async function () {
    this.timeout(5000);
    rpipackages();
    const [pkgs, errs] = await readAptSource('http://archive.raspberrypi.org/debian//dists/buster/main/binary-armhf/Packages');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(1402);
    expect(errs.length).to.eql(0);
  });

  it('should return binary package info from gzipped index and raw URL', async function () {
    this.timeout(5000);
    rpipackagesgz();
    const [pkgs, errs] = await readAptSource('http://archive.raspberrypi.org/debian//dists/buster/main/binary-armhf/Packages.gz');
    expect(nock.activeMocks().length).to.eql(0);
    expect(pkgs.length).to.eql(1402);
    expect(errs.length).to.eql(0);
  });
});
