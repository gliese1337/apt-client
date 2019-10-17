import { version_cmp } from './version_cmp';
import { PkgVersionInfo, BasePkgInfo, readAptSource, SrcPkgInfo, BinPkgInfo } from './aptreader';

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
  private updatePromise: Promise<void[]> | null = null;

  constructor(private sources: string[] = [], private arch: string = 'all', private cachetime = -Infinity) { }

  public async update(
    sources = this.sources,
    arch = this.arch,
    cachetime = this.cachetime,
    clear = true,
  ) {
    if (this.updatePromise) {
      // wait for previously-started update process to conclude.
      await this.updatePromise;
    }

    const { bin_pkgs, src_pkgs, lastUpdated } = this;
    if (clear) {
      bin_pkgs.clear();
      src_pkgs.clear();
    }

    // Set the updatePromise so concurrent calls will know to wait.
    this.updatePromise = Promise.resolve().then(() => {
      const now = Date.now();

      const updateSrc = isFinite(cachetime) && cachetime > 0 ? async s => {
        const lu = lastUpdated.get(s);
        if (lu && (now - lu[0] < cachetime)) {
          if (!clear) return [];
          return lu[1];
        }
        const pkgs = await readAptSource(s, arch);
        lastUpdated.set(s, [now, pkgs]);
        return pkgs;
      } : async s => {
        const pkgs = await readAptSource(s, arch);
        lastUpdated.set(s, [now, pkgs]);
        return pkgs;
      };

      return Promise.all(sources.map(async s => {
        const pkgs = await updateSrc(s);
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
      }));
    });

    await this.updatePromise;
    // Clear the updatePromise so later calls don't wait unnecessarily.
    this.updatePromise = null;
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
      if (bin_pkgs.has(name)) {
        bin_info.set(name, bin_pkgs.get(name).versions);
      }

      if (src_pkgs.has(name)) {
        src_info.set(name, src_pkgs.get(name).versions);
      } 
    }

    return { bin: bin_info, src: src_info };
  }

  public getBinFiles(pkgs: Iterable<string | [string, string]>) {
    return iterVersionedPackageFiles(pkgs, this.bin_pkgs, async (info) => {
      const res = await fetch(`${ info.RepoBase }/${ info.Filename }`);
      return await res.arrayBuffer();
    });
  }

  public getSrcFiles(pkgs: Iterable<string | [string, string]>) {
    return iterVersionedPackageFiles(pkgs, this.src_pkgs, async (info) => {
      const obj = {} as { [key: string]: ArrayBuffer };
      for (const { name } of info.Files) {
        const res = await fetch(`${ info.RepoBase }/${ info.Directory }/${ name }`);
        obj[name] = await res.arrayBuffer();
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
