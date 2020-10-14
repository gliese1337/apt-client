Apt-Client
==========

A basic Apt client for node and the browser, so you can get information about debian packages.

* `new AptClient(sources?: string[], arch?: string, cachetime? number)` Constructs a new client for a possibly-empty list of source and optionally-specified architecture (defaults to 'all'). The sources should be strings just like you would see in a `sources.list` file, one per line, or URLs directly to a Sources(.gz) or Packages(.gz) file. If `cachetime` is specified, `client.update` will avoid re-requesting data for particular sources if they have already been requested within the last `cachetime` milliseconds.

* `client.update(sources?: string[], arch?: string, cachetime? number, clear?: boolean): Promise<[string, string][]>` Rewrites the local cache with data fetched from the specified `sources`. The first three arguments default to the values provided to the constructor. This allows you the flexibility to specify a source list, target architecture, or cache timeout at client-creation time, or at update time. The `clear` parameter specifies whether the cached package data should be totally replaced, or only updated--the latter is useful if you wish to re-request a specific source without wiping out cached data previously requested from other sources. This defaults to true. The return value is a list of error pairs, with the first element of each pair being a description of the error, and the second being the repo spec or URL on which the error occurred.

* `client.getPackages(): { bin: string[], src: string[] }` Returns lists of the names of all packages available as binaries or source.

* `client.listVersions(pkgName: string): { bin: string[], src: string[] }` For a given package name, returns all of the versions available in binary or source formats.

* `client.getPkgInfo(pkgNames: Iterable<string>): Promise<{ bin: Map<string, PkgInfo<BinPkgInfo>>, src: Map<string, PkgInfo<SrcPkgInfo>> }>` Gets detailed information about the named packages.

* `client.getBinFiles(pkgNames: Iterable<string>, checkHash=true): Promise<Map<string, ArrayBuffer | null>>` Gets the binary `.deb` files for a list of packages as `ArrayBuffer`s. If `checkHash` is not false, and an MD5, SHA1, or SHA256 hash was specified for a given package, the downloaded file data will be discarded and the package's entry in the returned map set to `null` unless the hash verification passes.

* `client.getSrcFiles(pkgNames: Iterable<string>, checkHash=true): Promise<Map<string, { [key: string]: ArrayBuffer | null}>>` Gets the source files for a list of packages, with the sources of each package provided as an object mapping from source file name to `ArrayBuffer`. If `checkHash` is not false, files listed in the package `Files` must match their specified size, and files listed in the `ChecksumsSha1` or `ChecksumsSha256` sections must match the provided hash, or their data will be discarded and the file's entry in the returned map will be set to `null`.

* `client.isLatest(pkgName: string, version: string): boolean` Checks if a given package version is the latest. Defaults to true if the package is not found in the cached sources. Checks against binary packages first, and source versions if the binary does not exist.

* `client.areLatest(packages: Iterable<[pkgName: string, version: string]>): Generator<[string, boolean]>` Checks if each package is at the latest version, with the same algorithm as `client.isLatest`.

* `client.getLatest(packages: Iterable<string>): Generator<[pkgName: string, version: string]>` Gets the latest version of each package available as a binary, or as a source if no binaries are available.

* `client.areAllLatest(packages: Iterable<[pkgName: string, version: string]>): boolean` Checks if all the requested packages are up to date; this is more efficient than `client.areLatest` due to short-circuiting on the first non-up-to-date package.

* `AptClient.cmpVersions(a: string, b: string): number` Compares two Debian package version strings and returns < 0 if `a` is less than `b`, > 0 if `a` is greater than `b`, and 0 if `a` equals `b`.

* `type PkgInfo<T> { latest: string, versions: Map<string, T> }` For a given package, caches the latest version available and provides a map from version numbers to more detailed information about that package version.

Data guaranteed to be available on all package version info objects includes: 
* `Package: string` The package name
* `RepoBase: string` The URL to the repository from which this information was obtained.
* `Version: string` The version of the package being described.
* `Maintainer: { name: string, email: string}` Contact information for the package maintainer.

Additional data guaranteed to be available on all version objects for binary packages includes:
* `Architecture: string[]` A list of architectures for which binaries are available.
* `InstalledSize: number`
* `Description: string`
* `Filename: string` A relative URL specifying where the binary file is stored in the repository.
* `Size: number`

Additional data guaranteed to be available on all version objects for source packages includes:
* `Directory: string` A relative URL specifying the directory in which source files are stored in the repository.
* `Files: { name: string, hash: string, size: number }[]` A list of objects describing the individual source files.

Numerous other optional fields may or may not be present depending on their presence in the specific repository being queried.