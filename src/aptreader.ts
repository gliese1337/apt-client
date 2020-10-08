import * as fp from 'fetch-ponyfill';
import inflate from './inflate';

const { fetch } = fp();

export type FileSpec = {
  hash: string;
  size: number;
  name: string;
};

export type ContactInfo = {
  name: string;
  email: string;
};

export type BasePkgInfo = {
  Package: string;
  RepoBase: string;
  Version: string;
  Section: string;
  Priority: 'optional' | 'extra' | 'source';
  Maintainer: ContactInfo;

  Homepage?: string;

  OriginalMaintainer?: ContactInfo;
  GoImportPath?: string;

  PythonVersion?: string;
  RubyVersions?: string[];
  LuaVersions?: string[];
};

export type SrcPkgInfo = BasePkgInfo & {
  type: 'src';

  Binary: string[];
  Format: string;
  Directory: string;

  Files: FileSpec[];
  ChecksumsSha256: FileSpec[];
  ChecksumsSha1: FileSpec[];

  Uploaders?: ContactInfo[];

  BuildDepends?: string[];
  BuildConflicts?: string[];
  BuildConflictsIndep?: string[];
  BuildDependsIndep?: string[];
  BuildDependsArch?: string[];
  BuildIndepArchitecture?: string;

  Architecture?: string[];
  StandardsVersion?: string;
  PackageList?: string[];
  Testsuite?: string;
  TestsuiteTriggers?: string[];

  VcsBrowser?: string;
  VcsGit?: string;
  VcsSvn?: string;
  VcsBzr?: string;
  VcsMtn?: string;
  VcsCvs?: string;
  VcsDarcs?: string;
  VcsHg?: string;
  VcsArch?: string;

  Dgit?: string;

  ExtraSourceOnly?: 'yes';
  DmUploadAllowed?: 'yes';
  Autobuild?: 'yes';

  PythonVersion?: string;
  RubyVersions?: string;

  Comment?: string;
};

export type BinPkgInfo = BasePkgInfo & {
  type: 'bin';

  InstalledSize: number;
  Architecture: string[];
  Description: string;
  Filename: string;
  Size: number;

  MultiArch?: 'same' | 'foreign';

  Depends?: string[];
  PreDepends?: string[];
  Recommends?: string[];
  Suggests?: string[];

  Descriptionmd5?: string;
  Tag?: string[];
  MD5sum?: string;
  SHA1?: string;
  SHA256?: string;

  Source?: string,
  Replaces?: string[],
  Breaks?: string[],
  Conflicts?: string[],
  Enhances?: string[],
  Provides?: string[],
  BuiltUsing?: string[],

  PythonEggName?: string;
  BuildEssential?: 'yes';
  Essential?: 'yes;'
};

export type PkgVersionInfo = SrcPkgInfo | BinPkgInfo;

function * matchAll(regexp: RegExp, str: string) {
  let match;
  while ((match = regexp.exec(str)) !== null) {
    yield match;
  }
}

function toContactInfo(s: string): ContactInfo {
  let match = s.match(/(.*)?<(.*?)>/);
  if (match) {
    const [ , name, email ] = s.match(/(.*)?<(.*?)>/) as string[];
    return { name: name.replace(/"|^\s+|\s+$/g, '') , email: email.trim() };
  }

  if(/^\s*\S+@\S+\s*$/.test(s)){
    return { name: '', email: s.trim() };
  }

  return { name: s.replace(/"|^\s+|\s+$/g, ''), email: '' };
}

function multiContactInfo(x: string): ContactInfo[] {
  const contacts = [];
  const l = x.length;
  let quoted = false;
  let start = 0;
  for (let i = 0; i < l; i++) {
    if (x[i] === '"') quoted = !quoted;
    if (x[i] == ',' && !quoted) {
      contacts.push(
        toContactInfo(x.substring(start, i).replace(/^\s*,\s*/,''))
      );
      start = i + 1;
    }
  }

  const rest = x.substring(start);
  if (!/^\s+$/.test(rest)) contacts.push(toContactInfo(rest));

  return contacts;
}

function splitspace(s: string): string[] {
  return s.split(/\s+/g).filter(x => x);
}

function splitlines(s: string): string[] {
  return s.split(/\r?\n\s*/gm);
}

function filespecs(s: string) {
  const specs: FileSpec[] = [];
  for (const [, hash, size, name] of matchAll(/^\s*(\S+)\s+(\S+)\s+(\S+)\s*$/gm, s)) {
    specs.push({ hash, size: parseInt(size, 10), name });
  }
  return specs;
}

function commas(s: string): string[] {
  return s.split(/\s*,\s*/g).map(x => x.trim()).filter(x => x);
}

function multiline(s: string) : string {
  return s.replace(/^\s*\.\s*$/gm, '');
}

function id(s: string) {
  return s;
}

const pkgInfoValueParsers = {
  Size: (x: string) => parseInt(x, 10),
  InstalledSize: (x: string) => parseInt(x, 10),

  Package: id,
  RepoBase: id,
  Version: id,

  Source: id,
  Format: id,
  Directory: id,

  Architecture: splitspace,
  Description: multiline,
  Filename: id,
  MD5sum: id,
  SHA256: id,

  Maintainer: toContactInfo,
  OriginalMaintainer: toContactInfo,
  Uploaders: multiContactInfo,
  PackageList: splitlines,
  TestsuiteTriggers: commas,
  Tag: commas,
  Binary: commas,
  Files: filespecs,
  ChecksumsSha256: filespecs,
  ChecksumsSha1: filespecs,
  Depends: commas,
  PreDepends: commas,
  Recommends: commas,
  Suggests: commas,
  BuildDepends: commas,
  BuildConflicts: commas,
  BuildConflictsIndep: commas,
  BuildDependsIndep: commas,
  BuildDependsArch: commas,

  BuiltUsing: commas,

  Provides: commas,
  Breaks: commas,
  Enhances: commas,
  Replaces: commas,
  Conflicts: commas,
  RubyVersions: splitspace,
  LuaVersions: splitspace,
} as unknown as { [key in keyof PkgVersionInfo]: (x: string) => PkgVersionInfo[key] };

function buf2string(buf: Uint8Array, len: number) {
  let result = '';
  let end = 0;
  const stride = 65534;
  for (let start = 0; start < len; start = end) {
    end = Math.min(len, start + stride);
    result += String.fromCharCode.apply(null, buf.subarray(start, end) as unknown as number[]);
  }

  return result;
}

function * iterRecords(chunks: Iterable<Uint8Array>): Generator<[string, string]|null> {
  const asciibuf = new Uint8Array(2 * 16384);

  let field = '';

  let state = 0;
  let out = 0;
  for (const buf of chunks) {
    const len = buf.length;

    if (state === 3) {
      const nc = buf[0];
      if (nc > 32 || nc === 10 || nc === 13) {
        if (field) yield [ field, buf2string(asciibuf, out) ];
        out = 0;
        state = 0;
      } else {
        state = 2;
      }
    }

    for (let i = 0; i < len;) {
      const c = buf[i++];

      if (state === 0 && c > 32) {
        state = 1;
      }

      if (state === 1) {
        if(c === 10) {
          out = 0;
          state = 0;
          continue;
        }
        if(c === 45) continue; // skip '-' in field names
        if(c === 58) { // found :
          field = buf2string(asciibuf, out);
          i++;
          out = 0;
          state = 2;
          continue;
        }
      }

      if(c === 10) { // found newline
        if(out === 0) { // found blank line
          yield null;
          state = 0;
          continue;
        }

        if (i === len) {
          state = 3;
          break;
        }
        state = 2;
        const nc = buf[i];
        if (nc > 32 || nc === 10 || nc === 13) {
          if (field) yield [ field, buf2string(asciibuf, out) ];
          out = 0;
          state = 0;
          continue;
        }
      }

      asciibuf[out++] = c;
    }
  }

  if (field) yield [field, buf2string(asciibuf, out)];
}

function parseIndex(
  chunks: Iterable<Uint8Array>,
  base: string,
  type: string,
  pkgs: PkgVersionInfo[],
): void {
  let pkg = { RepoBase: base, type } as PkgVersionInfo;

  for (const r of iterRecords(chunks)) {
    if (r === null) {
      if (pkg.Package) pkgs.push(pkg);
      pkg = { RepoBase: base, type } as PkgVersionInfo;
    } else {
      const key = r[0] as keyof PkgVersionInfo;
      const parser = pkgInfoValueParsers[key];
      if (parser) pkg[key] = parser(r[1].trim()) as never;
    }
  }

  if (pkg.Package) pkgs.push(pkg);
}

export async function readAptSource(spec: string, arch = 'all') {
  const [ type, base, dist, ...components ] = spec.split(/\s/g);
  const [ t, dir, fname ] = type === 'deb' ?
    [ 'bin', 'binary-' + arch, 'Packages' ] :
    [ 'src', 'source', 'Sources' ];

  const pkgs: PkgVersionInfo[] = [];
  const ps = components.map(async(set) => {
    const url = `${ base }/dists/${ dist }/${ set }/${ dir }/${ fname }`;
    let chunks: Iterable<Uint8Array>;

    let res = await fetch(url);
    if (res.status === 200) {
      chunks = [new Uint8Array(await res.arrayBuffer())];
    } else {
      res = await fetch(url+'.gz');
      if (res.status !== 200) return;
      chunks = inflate(new Uint8Array(await res.arrayBuffer()));
    }

    parseIndex(chunks, base, t, pkgs);
  });

  await Promise.all(ps);

  return pkgs;
}
