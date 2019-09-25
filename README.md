Apt-Client
==========

A basic Apt client for node and the browser, so you can get information about debian packages.

* `new AptClient(sources?: string[], arch?: string, cachetime? number)` Constructs a new client for a possibly-empty list of source and optionally-specified architecture (defaults to 'all'). The sources should be strings just like you would see in a `sources.list` file, one per line. If `cachetime` is specified, `client.update` will avoid re-requesting data for particular sources if they have already been requested within the last `cachetime` milliseconds.

* `client.update(sources?: string[], arch?: string, cachetime? number, clear?: boolean): Promise<void>` Rewrites the local cache with data fetched from the specified `sources`. The first three arguments default to the values provided to the constructor. This allows you the flexibility to specify a source list, target architecture, or cache timeout at client-creation, or at update time. The `clear` parameter specifies whether the cached package data should be totally replace, or only updated--the latter is useful if you wish to re-request a specific source without wiping out cached data previously requested from other sources. This defaults to true.

* `client.getPkgInfo(pkgNames: Iterable<string>): Promise<{ bin: Map<string, BinPkgInfo>, src: Map<string, SrcPkgInfo> }>` Gets detailed information about the named packages. 

* `client.getBinFiles(pkgNames: Iterable<string>): Promise<Map<string, ArrayBuffer>>` Gets the binary `.deb` files for a list of packages as `ArrayBuffer`s.

* `client.getSrcFiles(pkgNames: Iterable<string>): Promise<Map<string, { [key: string]: ArrayBuffer;}>>` Gets the source files for a list of packages, with the sources of each package provided as an object mapping from source file name to `ArrayBuffer`.

* `client.isLatest(pkgName: string, version: string): boolean` Checks if a given package version is the latest. Defaults to true if the package is not found in the cached sources. Checks against binary packages first, and source versions if the binary does not exist.

* `client.areLatest(packages: Iterable<[pkgName: string, version: string]>): Generator<[string, boolean]>` Checks if each package is at the latest version, with the same algorithm as `client.isLatest`.

* `client.areAllLatest(packages: Iterable<[pkgName: string, version: string]>): boolean` Checks if all the requested packages are up to date; this is more efficient than `client.areLatest` due to short-circuiting on the first non-up-to-date package.

* `AptClient.cmpVersions(a: string, b: string): number` Compares two Debian package version strings and returns < 0 if `a` is less than `b`, > 0 if `a` is greater than `b`, and 0 if `a` equals `b`.