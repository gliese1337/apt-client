'use strict';

const { expect } = require('chai');
const { vstrcmp, version_cmp } = require('../dist/version_cmp.js');

describe('test version string character comparison algorithm', () => {
  it('should compare ~, letters, non-letters, and empty strings correctly', () => {
    //'~~', '~~a', '~', the empty part, 'a'
    expect(vstrcmp('~~', '~~a')).to.be.lessThan(0);
    expect(vstrcmp('~~a', '~')).to.be.lessThan(0);
    expect(vstrcmp('~','')).to.be.lessThan(0);
    expect(vstrcmp('', 'a')).to.be.lessThan(0);
    expect(vstrcmp('~~a', '~~')).to.be.greaterThan(0);
    expect(vstrcmp('~', '~~a')).to.be.greaterThan(0);
    expect(vstrcmp('','~')).to.be.greaterThan(0);
    expect(vstrcmp('a', '')).to.be.greaterThan(0);
    expect(vstrcmp('a', '~')).to.be.greaterThan(0);
    expect(vstrcmp('~', 'a')).to.be.lessThan(0);
    expect(vstrcmp('a', '#')).to.be.lessThan(0);
    expect(vstrcmp('#', 'a')).to.be.greaterThan(0);
    expect(vstrcmp('#', '~')).to.be.greaterThan(0);
    expect(vstrcmp('~', '#')).to.be.lessThan(0);
    expect([
      '~~a', '', '#', '~~', 'a', '~'
    ].sort(vstrcmp)).to.eql([
      '~~', '~~a', '~', '', 'a', '#'
    ]);
  });
});

describe('test full version comparison algorithm', () => {
  it('should compare revision-only version strings correctly', () => {
    expect(version_cmp('0.3.0', '1.9.0')).to.be.lessThan(0);
    expect(version_cmp('2.9.0', '1.9.0')).to.be.greaterThan(0);
    expect(version_cmp('2.9.0', '1.10.0')).to.be.greaterThan(0);
    expect(version_cmp('1.10.0','1.9.0')).to.be.greaterThan(0);
    expect([
      '0.3.0', '2.9.0', '1.9.0', '1.10.0'
    ].sort(version_cmp)).to.eql([
      '0.3.0', '1.9.0', '1.10.0', '2.9.0'
    ]);
  });

  const list = [
    ['333', '22.2'],
    ['0-b', '0-a'],
    ['0b-0', '0a-0'],
    ['1.0.1', '1.0.0'],
    ['1.1.0', '1.0.0'],
    ['1.1.0', '1.0.1'],
    ['1.1.1', '1.1.0'],
    ['1.0.0', '1.0.0~rc1'],
    ['1.0.0~rc2', '1.0.0~rc1'],
    ['1.0.0~rc2+v1', '1.0.0~rc2'],
    ['1.0.1~rc2+v2', '1.0.1~rc2+v1'],
    ['1.0.0+v10', '1.0.0+v1'],
    ['2.11-9', '2.10-18+deb7u4'],
    ['2.11-18+deb7u4', '2.11-18'],
    ['2.11-18', '2.11-18~deb7u4'],
    ['2.11-18~deb7u4', '2.10-18'],
    ['2:1.2', '1:1.2'],
    ['2:1.1235-1', '2:1.1234-4'],
    ['3:1.1235-1', '2:1.1234-4'],
    ['3:1.1235-4', '3:1.1235'],
    ['3:1.1235-~', '3:1.1235'],
  ];

  for (const [a, b] of list) {
    it(`should compare ${ a } and ${ b } correctly`, () => {
      expect(version_cmp(a, b)).to.be.greaterThan(0);
      expect(version_cmp(b, a)).to.be.lessThan(0);
    });
  }

  it('should compare identical versions correctly', () => {
    expect(version_cmp('0:1-2', '0:1-2')).to.equal(0);
  });
});

describe('detect invalid versions', () => {
  it('should detect invalid character in upstream version', () => {
    expect(() => version_cmp('0?', '0?')).to.throw('Invalid Upstream Version String');
  });

  it('should detect invalid character in revision number', () => {
    expect(() => version_cmp('1-0?', '1-0?')).to.throw('Invalid Revision String');
  });

  it('should detect invalid colon in absence of epoch', () => {
    expect(() => version_cmp('a:0', 'a:0')).to.throw('Invalid Upstream Version String');
  });
});
