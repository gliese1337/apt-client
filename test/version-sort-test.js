'use strict';

const { expect } = require('chai');
const { vstrcmp, version_cmp } = require('../dist/version_cmp.js');

describe('test version string character comparison algorithm', () => {
  it('should compare ~, letters, non-letters, and empty strings correctly', async() => {
    //'~~', '~~a', '~', the empty part, 'a'
    expect(vstrcmp('~~', '~~a') < 0).to.equal(true);
    expect(vstrcmp('~~a', '~') < 0).to.equal(true);
    expect(vstrcmp('~','') < 0).to.equal(true);
    expect(vstrcmp('', 'a') < 0).to.equal(true);
    expect(vstrcmp('~~a', '~~') > 0).to.equal(true);
    expect(vstrcmp('~', '~~a') > 0).to.equal(true);
    expect(vstrcmp('','~') > 0).to.equal(true);
    expect(vstrcmp('a', '') > 0).to.equal(true);
    expect(vstrcmp('a', '~') > 0).to.equal(true);
    expect(vstrcmp('~', 'a') < 0).to.equal(true);
    expect(vstrcmp('a', '#') < 0).to.equal(true);
    expect(vstrcmp('#', 'a') > 0).to.equal(true);
    expect(vstrcmp('#', '~') > 0).to.equal(true);
    expect(vstrcmp('~', '#') < 0).to.equal(true);
    expect([
      '~~a', '', '#', '~~', 'a', '~'
    ].sort(vstrcmp)).to.eql([
      '~~', '~~a', '~', '', 'a', '#'
    ]);
  });
});
