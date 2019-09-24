function isDigit(c: string) {
  const code = c.charCodeAt(0);
  return code >= 48 && code <= 57;
}

function * splitCharTypes(s: string) {
  for (let digit = false; s.length; digit = !digit) {
    let i = 0;
    while(i < s.length && digit === isDigit(s[i])) i++;
    yield s.substring(0, i);
    s = s.substring(i);
  }

  for(;;) yield '';
}

function isLetter(code: number) {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

export function vstrcmp(a: string, b: string) {
  for(let i = 0;;i++) {
    if(i >= a.length) {
      if(i >= b.length) {
        return 0;
      }
      return b[i] === '~' ? 1 : -1;
    }
    if(i >= b.length) {
      return a[i] === '~' ? -1 : 1;
    }
    
    const ai = a.charCodeAt(i);
    const bi = b.charCodeAt(i);
    if (ai === bi) continue;
    if (ai === 126) return -1; //tilde sorts before anything
    if (bi === 126) return 1; //tilde sorts before anything
    if(isLetter(ai)) {
      if (isLetter(bi)) {
        return ai - bi;
      }
      // letters sort before non-letters
      return -1;
    }
    if (isLetter(bi)) {
      return 1;
    }
  
    return ai - bi;
  }
}

// https://manpages.debian.org/wheezy/dpkg-dev/deb-version.5.en.html
function breakVersionString(s: string) {
  const m = s.match(/(?:(\d+):)?([A-Za-z0-9.+-:~]+?)(?:-([A-Za-z0-9.+~]*))?/);
  if (!m) throw new Error("Invalid Version String");
  const [ , epoch, upstream, revision ] = m;
  if (!epoch && upstream.includes(':')) throw new Error("Upstream Version cannot contain colons in absence of epoch field");
  return {
    epoch: epoch ? parseInt(epoch, 10) : 0,
    upstream,
    revision: revision || '',
  };
}

function cmpVersionPart(a: string, b: string) {
  const aparts = splitCharTypes(a);
  const bparts = splitCharTypes(b);

  for (let i = 0;;i++) {
    const ai = aparts.next().value as string;
    const bi = bparts.next().value as string;

    if(ai.length === 0 && bi.length === 0) return 0;

    const c = i%2 === 0 ?
      vstrcmp(ai, bi) :
      (+ai) - (+bi);
    if (c !== 0) return c;
  }
}

export  function version_cmp(a: string, b: string) {
  const { epoch: ae, upstream: au, revision: ar } = breakVersionString(a);
  const { epoch: be, upstream: bu, revision: br } = breakVersionString(b);

  let c = ae - be;
  if (c !== 0) return c;

  c = cmpVersionPart(au, bu);
  if (c !== 0) return c;

  return cmpVersionPart(ar, br);
}
