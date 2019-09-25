import { version_cmp } from './version_cmp';
import { PkgInfo, PkgSpec, readAptSource, SrcPkgInfo, BinPkgInfo } from './aptreader';

export { PkgInfo, PkgSpec };
export class AptClient {
  private bin_pkgs = new Map<string, [BinPkgInfo, ArrayBuffer | null]>();
  private src_pkgs = new Map<string, [SrcPkgInfo, { [key: string]: ArrayBuffer } | null]>();
  private lastUpdated = new Map<string, [number, PkgInfo[]]>();
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
        let pkgs: PkgInfo[];
        if (lu && (now - lu[0] < cachetime)) {
          if (!clear) return;
          pkgs = lu[1];
        } else {
          pkgs = await readAptSource(s, arch);
          lastUpdated.set(s, [now, pkgs]);
        }
        for (const pkg of pkgs) {
          (pkg.type === 'bin' ? bin_pkgs : src_pkgs).set(pkg.Package, [ pkg as any, null ]);
        }
      } : async s => {
        const pkgs = await readAptSource(s, arch);
        lastUpdated.set(s, [now, pkgs]);
        for (const pkg of pkgs) {
          (pkg.type === 'bin' ? bin_pkgs : src_pkgs).set(pkg.Package, [ pkg as any, null ]);
        }
      };

      return Promise.all(sources.map(updateSrc));
    });

    await this.updatePromise;
    // Clear the updatePromise so later calls don't wait unnecessarily.
    this.updatePromise = null;
  }

  public async getPkgInfo(pkgNames: Iterable<string>) {
    const bin_info: Map<string, BinPkgInfo> = new Map();
    const src_info: Map<string, SrcPkgInfo> = new Map();
    const { bin_pkgs, src_pkgs } = this;

    for (const name of pkgNames) {
      let data: [PkgInfo, any] | undefined;
      
      data = bin_pkgs.get(name);
      if (data) {
        bin_info.set(name, data[0] as BinPkgInfo);
      }

      data = src_pkgs.get(name);
      if (data) {
        src_info.set(name, data[0] as SrcPkgInfo);
      } 
    }

    return { bin: bin_info, src: src_info };
  }

  public async getBinFiles(pkgNames: Iterable<string>) {
    const files: Map<string, ArrayBuffer> = new Map();
    const { bin_pkgs } = this;

    for (const name of pkgNames) {
      const data = bin_pkgs.get(name);
      if (data) {
        const info = data[0];
        if (!data[1]) {
          const res = await fetch(`${ info.RepoBase }/${ info.Filename }`);
          data[1] = await res.arrayBuffer();
        }
        files.set(name, data[1] as ArrayBuffer);
      } 
    }

    return files;
  }

  public async getSrcFiles(pkgNames: Iterable<string>) {
    const files: Map<string, { [key: string]: ArrayBuffer }> = new Map();
    const { src_pkgs } = this;

    for (const name of pkgNames) {
      const data = src_pkgs.get(name);
      if (data) {
        const info = data[0];
        if (!data[1]) {
          const obj = {} as { [key: string]: ArrayBuffer };
          for (const { name } of info.Files) {
            const res = await fetch(`${ info.RepoBase }/${ info.Directory }/${ name }`);
            obj[name] = await res.arrayBuffer();
          }
          data[1] = obj;
        }
        files.set(name, data[1]);
      } 
    }

    return files;
  }

  public isLatest(pkgName: string, version: string) {
    const data = this.bin_pkgs.get(pkgName) || this.src_pkgs.get(pkgName);
    if (!data) return true;
    return version_cmp(data[0].Version, version) < 1;
  }

  public * areLatest(packages: Iterable<[string, string]>) {
    const { bin_pkgs, src_pkgs } = this;
    for (const [name, version] of packages) {
      const data = bin_pkgs.get(name) || src_pkgs.get(name);
      yield [name, (!data) || (version_cmp(data[0].Version, version) < 1)];
    }
  }

  public areAllLatest(packages: Iterable<[string, string]>) {
    const { bin_pkgs, src_pkgs } = this;
    for (const [name, version] of packages) {
      const data = bin_pkgs.get(name) || src_pkgs.get(name);
      if (data && version_cmp(data[0].Version, version) > 0) {
        return false;
      }
    }

    return true;
  }

  public static cmpVersions = version_cmp;
}
