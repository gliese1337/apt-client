
// https://manpages.debian.org/wheezy/dpkg-dev/deb-version.5.en.html

/* Take a version string part (upstream-version or debian-revision) and
   split it into contiguous sequences of digit and non-digit characters */

function isDigit(c: string) {
  return c >= '0' && c <= '9';
}

function * splitCharTypes(s: string) {
  // Documentation specifies that we look for leading non-digit characters
  // first, but also that upstream-versions *should* start with a digit.
  // Thus, we obtain better efficiency by looking for digits first.
  // If a part doesn't start with a digit, we just return an empty string as
  // the first chunk, and the rest of the comparison proceeds unchanged.
  for (let digit = true; s.length; digit = !digit) {
    let i = 0;
    while(i < s.length && digit === isDigit(s[i])) i++;
    yield s.substring(0, i);
    s = s.substring(i);
  }
}

/* The lexical comparison is a comparison of ASCII values modified so that all
   the letters sort earlier than all the non-letters and so that a tilde sorts
   before anything, even the end of a part. */

function isLetter(code: number) {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

export function vstrcmp(a: string, b: string) {
  for(let i = 0;;i++) {
    //tilde sorts before end-of-part
    if(i >= a.length) {
      return i >= b.length ? 0 :
             b[i] === '~' ? 1 : -1;
    }
    if(i >= b.length) {
      return a[i] === '~' ? -1 : 1;
    }
    
    const ai = a.charCodeAt(i);
    const bi = b.charCodeAt(i);
    if (ai === bi) continue;

    //tilde sorts before any other character
    if (ai === 126) return -1; 
    if (bi === 126) return 1;

    // letters sort before non-letters
    if(isLetter(ai)) {
      return isLetter(bi) ? ai - bi : -1;
    }
    if (isLetter(bi)) {
      return 1;
    }
  
    // Otherwise, sort in codepoint order
    return ai - bi;
  }
}

function breakVersionString(s: string) {
  //Version numbers as used for Debian binary and source packages consist of three components:
  // epoch, upstream-version, and debian-revision

  /* epoch
  This is a single (generally small) unsigned integer, delimited by a colon.
  If it is omitted then the upstream-version may not contain any colons.
  */

  const epoch_m = s.match(/^(\d+):/);
  const epoch = epoch_m && epoch_m[1];

  /* upstream-version
  This is the main part of the version number.
  It may contain only alphanumerics ("A-Za-z0-9") and the characters . + - : ~ and should start with a digit.
  If there is no debian-revision then hyphens are not allowed; if there is no epoch then colons are not allowed.
  */
  
  // default to no colons allowed
  let check_upstream = /^[-A-Za-z0-9.+~]*$/;
  if (typeof epoch === 'string') {
    // if there is an epoch, colons *are* allowed
    s = s.substr(epoch.length+1);
    check_upstream = /^[-A-Za-z0-9.+:~]*$/;
  }

  /* debian-revision
  This may contain only alphanumerics and the characters + . ~
  If it isn't present then the upstream-version may not contain a hyphen.
  There is no need to check that condition explicitly, as the debian-revision
  is identified by the presence of a hyphen; thus, if there are any hyphens,
  there is a debian-revision, and if there are no hyphens, the upstream-version
  trivially lacks hyphens.
  */

  const lastHyphen = s.lastIndexOf('-');
  const [ upstream, revision ]  = lastHyphen === -1 ? [ s, '' ] :
    [ s.substring(0, lastHyphen), s.substring(lastHyphen+1) ];

  if (!check_upstream.test(upstream)) {
    throw new Error("Invalid Upstream Version String");
  }
  
  if (!/^[A-Za-z0-9.+~]*$/.test(revision)) {
    throw new Error("Invalid Revision String");
  }

  return {
    // Epoch may be omitted, in which case zero is assumed.
    epoch: epoch ? parseInt(epoch, 10) : 0,
    upstream,
    revision: revision || '',
  };
}

/*
Sorting Algorithm
The upstream and revision parts are compared by the same algorithm:
The strings are compared from left to right.
First the initial part of each string consisting entirely of non-digit characters is determined.
These two parts (one of which may be empty) are compared lexically. If a difference is found it is returned. 
Then the initial part of the remainder of each string which consists entirely of digit characters is determined. The numerical values of these two parts are compared, and any difference found is returned as the result of the comparison. For these purposes an empty string (which can only occur at the end of one or both version strings being compared) counts as zero.
These two steps (comparing and removing initial non-digit strings and initial digit strings) are repeated until a difference is found or both strings are exhausted.
*/
function cmpVersionPart(a: string, b: string) {
  const aparts = splitCharTypes(a);
  const bparts = splitCharTypes(b);

  for (let i = 0;;i++) {
    const ai = aparts.next().value;
    const bi = bparts.next().value;

    if(ai === void 0) {
      if (bi === void 0) return 0;
    }

    const c = i%2 === 1 ?
      vstrcmp(ai || '', bi || '') :
      (+ai) - (+bi);
    if (c !== 0) return c;
  }
}

export function version_cmp(a: string, b: string) {
  const { epoch: ae, upstream: au, revision: ar } = breakVersionString(a);
  const { epoch: be, upstream: bu, revision: br } = breakVersionString(b);

  let c = ae - be;
  if (c !== 0) return c;

  c = cmpVersionPart(au, bu);
  if (c !== 0) return c;

  // The absence of a debian-revision compares earlier than the presence of one.
  if (ar.length === 0) {
    return br.length === 0 ? 0 : -1;
  }

  if (br.length === 0 /* && ar.length > 0 */) return 1;

  return cmpVersionPart(ar, br);
}
