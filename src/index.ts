import { version_cmp } from './version_cmp';
import { PkgVersionInfo, BasePkgInfo, readAptSource, SrcPkgInfo, BinPkgInfo } from './aptreader';
import fp from 'fetch-ponyfill';
import md5 from 'md5';
import sha1 from 'sha1';
import sha256 from 'sha256';
import bufferFrom from 'buffer-from';

const { fetch } = fp();

export { PkgVersionInfo };

export type PkgInfo<T extends BasePkgInfo> = {
  latest: string;
  versions: Map<string, T>;
};

async function iterVersionedPackageFiles<T extends BasePkgInfo, F>(
  pkgs: Iterable<string | [string, string]>,
  cache: Map<string, { versions: PkgInfo<T>, files: Map<string, F> }>,
  cb: (info: T) => Promise<F | undefined>,
) {
  const files: Map<string, F> = new Map();

  for (const pkg of pkgs) {
    let name: string;
    let version: string | undefined;
    if (typeof pkg === 'string') {
      name = pkg;
    } else {
      [ name, version ] = pkg;
    }

    const data = cache.get(name);
    if (data) { // if the package exists...
      const { versions, files: pkgfiles } = data;
      if (!version) version = versions.latest;
      let file = pkgfiles.get(version);
      if (file) { // if the file is cached, return it
        files.set(name, file);
      } else {
        const info = versions.versions.get(version);
        if (info) { // if the requested version exists....
          const f = await cb(info);
          if (f) {
            pkgfiles.set(version, f);
            files.set(name, f);
          }
        }
      }
    }
  }

  return files;
}

export class AptClient {
  private bin_pkgs = new Map<string, { versions: PkgInfo<BinPkgInfo>, files: Map<string, ArrayBuffer> }>();
  private src_pkgs = new Map<string, { versions: PkgInfo<SrcPkgInfo>, files: Map<string, { [key: string]: ArrayBuffer }>}>();
  private lastUpdated = new Map<string, [number, PkgVersionInfo[]]>();
  private updatePromise: Promise<[string, string][]> | null = null;

  constructor(private sources: string[] = [], private arch: string = 'all', private cachetime = -Infinity) { }

  public async update(
    sources = this.sources,
    arch = this.arch,
    cachetime = this.cachetime,
    clear = true,
  ): Promise<[string, string][]> {
    if (this.updatePromise) {
      // wait for previously-started update process to conclude.
      await this.updatePromise;
    }

    const { bin_pkgs, src_pkgs, lastUpdated } = this;
    if (clear) {
      bin_pkgs.clear();
      src_pkgs.clear();
    }

    const now = Date.now();

    const updateSrc: (s: string) => Promise<[PkgVersionInfo[], [string, string][]]> =
      isFinite(cachetime) && cachetime > 0 ? async(s: string) => {
        const lu = lastUpdated.get(s);
        if (lu && (now - lu[0] < cachetime)) {
          if (!clear) return [[],[]];
          return [lu[1],[]];
        }
        const [pkgs, errs] = await readAptSource(s, arch);
        lastUpdated.set(s, [now, pkgs]);
        return [pkgs, errs];
      } : async(s: string) => {
        const [pkgs, errs] = await readAptSource(s, arch);
        lastUpdated.set(s, [now, pkgs]);
        return [pkgs, errs];
      };

    this.updatePromise = Promise.all(sources.map(async s => {
      const [pkgs, errs] = await updateSrc(s);
      for (const pkg of pkgs) {
        const { type, Package: name, Version: version } = pkg;

        const index = type === 'bin' ? bin_pkgs : src_pkgs;
        let info = index.get(pkg.Package);

        if (!info) {
          index.set(name, {
            versions: { latest: version, versions: new Map([[version, pkg as any]]) },
            files: new Map(),
          });
        } else {
          const { latest, versions } = info.versions;
          versions.set(version, pkg as any);
          if (version_cmp(version, latest) > 0) {
            info.versions.latest = version;
          }
        }
      }

      return errs;
    })).then(errs => errs.flat());

    const errs = await this.updatePromise;

    // Clear the updatePromise so later calls don't wait unnecessarily.
    this.updatePromise = null;

    return errs;
  }

  public listPackages() {
    return { bin: [...this.bin_pkgs.keys()], src: [...this.src_pkgs.keys()] };
  }

  public listVersions(pkgName: string) {
    let bin: string[];
    const bin_info = this.bin_pkgs.get(pkgName);
    if (bin_info) {
      bin = [...bin_info.versions.versions.keys()];
    } else {
      bin = [];
    }

    let src: string[];
    const src_info = this.src_pkgs.get(pkgName);
    if (src_info) {
      src = [...src_info.versions.versions.keys()];
    } else {
      src = [];
    }

    return { bin, src };
  }

  public async getPkgInfo(pkgNames: Iterable<string>) {
    const bin_info: Map<string, PkgInfo<BinPkgInfo>> = new Map();
    const src_info: Map<string, PkgInfo<SrcPkgInfo>> = new Map();
    const { bin_pkgs, src_pkgs } = this;

    for (const name of pkgNames) {
      const bin_pkg = bin_pkgs.get(name);
      if (bin_pkg) {
        bin_info.set(name, bin_pkg.versions);
      }

      const src_pkg = src_pkgs.get(name);
      if (src_pkg) {
        src_info.set(name, src_pkg.versions);
      }
    }

    return { bin: bin_info, src: src_info };
  }

  public getBinFiles(pkgs: Iterable<string | [string, string]>, checkHash=true) {
    return iterVersionedPackageFiles(pkgs, this.bin_pkgs, async (info) => {
      const res = await fetch(`${ info.RepoBase }/${ info.Filename }`);
      const data = await res.arrayBuffer();
      if (checkHash) {
        if (info.SHA256) {
          const nhash = sha256(bufferFrom(data));
          if (nhash !== info.SHA256) return null;
        } else if (info.SHA1) {
          const nhash = sha1(bufferFrom(data));
          if (nhash !== info.SHA1) return null;
        } else if (info.MD5sum) {
          const nhash = md5(bufferFrom(data));
          if (nhash !== info.MD5sum) return null;
        }
      }
      return data;
    });
  }

  public getSrcFiles(pkgs: Iterable<string | [string, string]>, checkHash=true) {
    return iterVersionedPackageFiles(pkgs, this.src_pkgs, async (info) => {
      const obj = {} as { [key: string]: ArrayBuffer | null };
      for (const { name, size } of info.Files) {
        const res = await fetch(`${ info.RepoBase }/${ info.Directory }/${ name }`);
        const data = await res.arrayBuffer();
        obj[name] = (!checkHash || (data.byteLength === size)) ? data : null;
      }
      for (const { name, size, hash } of info.ChecksumsSha1) {
        const res = await fetch(`${ info.RepoBase }/${ info.Directory }/${ name }`);
        const data = await res.arrayBuffer();
        obj[name] = (!checkHash || (data.byteLength === size && sha1(bufferFrom(data)) === hash)) ? data : null;
      }
      for (const { name, size, hash } of info.ChecksumsSha256) {
        const res = await fetch(`${ info.RepoBase }/${ info.Directory }/${ name }`);
        const data = await res.arrayBuffer();
        obj[name] = (!checkHash || (data.byteLength === size && sha256(bufferFrom(data)) === hash)) ? data : null;
      }
      return obj;
    });
  }

  public isLatest(pkgName: string, version: string) {
    const data = this.bin_pkgs.get(pkgName) || this.src_pkgs.get(pkgName);
    if (!data) return true;
    return version_cmp(data.versions.latest, version) < 1;
  }

  public * areLatest(packages: Iterable<[string, string]>) {
    const { bin_pkgs, src_pkgs } = this;
    for (const [name, version] of packages) {
      const data = bin_pkgs.get(name) || src_pkgs.get(name);
      yield [name, (!data) || (version_cmp(data.versions.latest, version) < 1)];
    }
  }

  public * getLatest(packages: Iterable<string>) {
    const { bin_pkgs, src_pkgs } = this;
    for (const name of packages) {
      const data = bin_pkgs.get(name) || src_pkgs.get(name);
      if (data) yield [name, data.versions.latest];
    }
  }

  public areAllLatest(packages: Iterable<[string, string]>) {
    const { bin_pkgs, src_pkgs } = this;
    for (const [name, version] of packages) {
      const data = bin_pkgs.get(name) || src_pkgs.get(name);
      if (data && version_cmp(data.versions.latest, version) > 0) {
        return false;
      }
    }

    return true;
  }

  public static cmpVersions = version_cmp;
}
