# Supported Platforms

Nix is currently supported on the following platforms:

  - Linux (i686, x86\_64, aarch64).

  - macOS (x86\_64).

# Installing a Binary Distribution

If you are using Linux or macOS versions up to 10.14 (Mojave), the
easiest way to install Nix is to run the following command:

```
  $ sh <(curl https://nixos.org/nix/install)
```

If you're using macOS 10.15 (Catalina) or newer, consult [the macOS
installation instructions](#sect-macos-installation) before installing.

As of Nix 2.1.0, the Nix installer will always default to creating a
single-user installation, however opting in to the multi-user
installation is highly recommended.

## Single User Installation

To explicitly select a single-user installation on your system:

```
  sh <(curl https://nixos.org/nix/install) --no-daemon
```

This will perform a single-user installation of Nix, meaning that `/nix`
is owned by the invoking user. You should run this under your usual user
account, *not* as root. The script will invoke `sudo` to create `/nix`
if it doesn’t already exist. If you don’t have `sudo`, you should
manually create `/nix` first as root, e.g.:

    $ mkdir /nix
    $ chown alice /nix

The install script will modify the first writable file from amongst
`.bash_profile`, `.bash_login` and `.profile` to source
`~/.nix-profile/etc/profile.d/nix.sh`. You can set the
`NIX_INSTALLER_NO_MODIFY_PROFILE` environment variable before executing
the install script to disable this behaviour.

You can uninstall Nix simply by running:

    $ rm -rf /nix

## Multi User Installation

The multi-user Nix installation creates system users, and a system
service for the Nix daemon.

  - Linux running systemd, with SELinux disabled

  - macOS

You can instruct the installer to perform a multi-user installation on
your system:

    sh <(curl https://nixos.org/nix/install) --daemon

The multi-user installation of Nix will create build users between the
user IDs 30001 and 30032, and a group with the group ID 30000. You
should run this under your usual user account, *not* as root. The script
will invoke `sudo` as needed.

<div class="note">

If you need Nix to use a different group ID or user ID set, you will
have to download the tarball manually and [edit the install
script](#sect-nix-install-binary-tarball).

</div>

The installer will modify `/etc/bashrc`, and `/etc/zshrc` if they exist.
The installer will first back up these files with a `.backup-before-nix`
extension. The installer will also create `/etc/profile.d/nix.sh`.

You can uninstall Nix with the following commands:

    sudo rm -rf /etc/profile/nix.sh /etc/nix /nix ~root/.nix-profile ~root/.nix-defexpr ~root/.nix-channels ~/.nix-profile ~/.nix-defexpr ~/.nix-channels

    # If you are on Linux with systemd, you will need to run:
    sudo systemctl stop nix-daemon.socket
    sudo systemctl stop nix-daemon.service
    sudo systemctl disable nix-daemon.socket
    sudo systemctl disable nix-daemon.service
    sudo systemctl daemon-reload

    # If you are on macOS, you will need to run:
    sudo launchctl unload /Library/LaunchDaemons/org.nixos.nix-daemon.plist
    sudo rm /Library/LaunchDaemons/org.nixos.nix-daemon.plist

There may also be references to Nix in `/etc/profile`, `/etc/bashrc`,
and `/etc/zshrc` which you may remove.

## macOS Installation

Starting with macOS 10.15 (Catalina), the root filesystem is read-only.
This means `/nix` can no longer live on your system volume, and that
you'll need a workaround to install Nix.

The recommended approach, which creates an unencrypted APFS volume for
your Nix store and a "synthetic" empty directory to mount it over at
`/nix`, is least likely to impair Nix or your system.

<div class="note">

With all separate-volume approaches, it's possible something on your
system (particularly daemons/services and restored apps) may need access
to your Nix store before the volume is mounted. Adding additional
encryption makes this more likely.

</div>

If you're using a recent Mac with a [T2
chip](https://www.apple.com/euro/mac/shared/docs/Apple_T2_Security_Chip_Overview.pdf),
your drive will still be encrypted at rest (in which case "unencrypted"
is a bit of a misnomer). To use this approach, just install Nix with:

    $ sh <(curl https://nixos.org/nix/install) --darwin-use-unencrypted-nix-store-volume

If you don't like the sound of this, you'll want to weigh the other
approaches and tradeoffs detailed in this section.

<div class="note">

<div class="title">

Eventual solutions?

</div>

All of the known workarounds have drawbacks, but we hope better
solutions will be available in the future. Some that we have our eye on
are:

1.  A true firmlink would enable the Nix store to live on the primary
    data volume without the build problems caused by the symlink
    approach. End users cannot currently create true firmlinks.

2.  If the Nix store volume shared FileVault encryption with the primary
    data volume (probably by using the same volume group and role),
    FileVault encryption could be easily supported by the installer
    without requiring manual setup by each user.

</div>

### Change the Nix store path prefix

Changing the default prefix for the Nix store is a simple approach which
enables you to leave it on your root volume, where it can take full
advantage of FileVault encryption if enabled. Unfortunately, this
approach also opts your device out of some benefits that are enabled by
using the same prefix across systems:

  - Your system won't be able to take advantage of the binary cache
    (unless someone is able to stand up and support duplicate caching
    infrastructure), which means you'll spend more time waiting for
    builds.

  - It's harder to build and deploy packages to Linux systems.

It would also possible (and often requested) to just apply this change
ecosystem-wide, but it's an intrusive process that has side effects we
want to avoid for now.

### Use a separate encrypted volume

If you like, you can also add encryption to the recommended approach
taken by the installer. You can do this by pre-creating an encrypted
volume before you run the installer--or you can run the installer and
encrypt the volume it creates later.

In either case, adding encryption to a second volume isn't quite as
simple as enabling FileVault for your boot volume. Before you dive in,
there are a few things to weigh:

1.  The additional volume won't be encrypted with your existing
    FileVault key, so you'll need another mechanism to decrypt the
    volume.

2.  You can store the password in Keychain to automatically decrypt the
    volume on boot--but it'll have to wait on Keychain and may not mount
    before your GUI apps restore. If any of your launchd agents or apps
    depend on Nix-installed software (for example, if you use a
    Nix-installed login shell), the restore may fail or break.

    On a case-by-case basis, you may be able to work around this problem
    by using `wait4path` to block execution until your executable is
    available.

    It's also possible to decrypt and mount the volume earlier with a
    login hook--but this mechanism appears to be deprecated and its
    future is unclear.

3.  You can hard-code the password in the clear, so that your store
    volume can be decrypted before Keychain is available.

If you are comfortable navigating these tradeoffs, you can encrypt the
volume with something along the lines of:

    alice$ diskutil apfs enableFileVault /nix -user disk

### Symlink the Nix store to a custom location

Another simple approach is using `/etc/synthetic.conf` to symlink the
Nix store to the data volume. This option also enables your store to
share any configured FileVault encryption. Unfortunately, builds that
resolve the symlink may leak the canonical path or even fail.

Because of these downsides, we can't recommend this approach.

### Notes on the recommended approach

This section goes into a little more detail on the recommended approach.
You don't need to understand it to run the installer, but it can serve
as a helpful reference if you run into trouble.

1.  In order to compose user-writable locations into the new read-only
    system root, Apple introduced a new concept called `firmlinks`,
    which it describes as a "bi-directional wormhole" between two
    filesystems. You can see the current firmlinks in
    `/usr/share/firmlinks`. Unfortunately, firmlinks aren't (currently?)
    user-configurable.

    For special cases like NFS mount points or package manager roots,
    [synthetic.conf(5)](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man5/synthetic.conf.5.html)
    supports limited user-controlled file-creation (of symlinks, and
    synthetic empty directories) at `/`. To create a synthetic empty
    directory for mounting at `/nix`, add the following line to
    `/etc/synthetic.conf` (create it if necessary):

        nix

2.  This configuration is applied at boot time, but you can use
    `apfs.util` to trigger creation (not deletion) of new entries
    without a reboot:

        alice$ /System/Library/Filesystems/apfs.fs/Contents/Resources/apfs.util -B

3.  Create the new APFS volume with diskutil:

        alice$ sudo diskutil apfs addVolume diskX APFS 'Nix Store' -mountpoint /nix

4.  Using `vifs`, add the new mount to `/etc/fstab`. If it doesn't
    already have other entries, it should look something like:

        #
        # Warning - this file should only be modified with vifs(8)
        #
        # Failure to do so is unsupported and may be destructive.
        #
        LABEL=Nix\040Store /nix apfs rw,nobrowse

    The nobrowse setting will keep Spotlight from indexing this volume,
    and keep it from showing up on your desktop.

## Installing a pinned Nix version from a URL

NixOS.org hosts version-specific installation URLs for all Nix versions
since 1.11.16, at `https://releases.nixos.org/nix/nix-version/install`.

These install scripts can be used the same as the main NixOS.org
installation script:

```
  sh <(curl https://nixos.org/nix/install)
```

In the same directory of the install script are sha256 sums, and gpg
signature files.

## Installing from a binary tarball

You can also download a binary tarball that contains Nix and all its
dependencies. (This is what the install script at
<https://nixos.org/nix/install> does automatically.) You should unpack
it somewhere (e.g. in `/tmp`), and then run the script named `install`
inside the binary tarball:

    alice$ cd /tmp
    alice$ tar xfj nix-1.8-x86_64-darwin.tar.bz2
    alice$ cd nix-1.8-x86_64-darwin
    alice$ ./install

If you need to edit the multi-user installation script to use different
group ID or a different user ID range, modify the variables set in the
file named `install-multi-user`.

# Installing Nix from Source

If no binary package is available, you can download and compile a source
distribution.

## Prerequisites

  - GNU Autoconf (<https://www.gnu.org/software/autoconf/>) and the
    autoconf-archive macro collection
    (<https://www.gnu.org/software/autoconf-archive/>). These are only
    needed to run the bootstrap script, and are not necessary if your
    source distribution came with a pre-built `./configure` script.

  - GNU Make.

  - Bash Shell. The `./configure` script relies on bashisms, so Bash is
    required.

  - A version of GCC or Clang that supports C++17.

  - `pkg-config` to locate dependencies. If your distribution does not
    provide it, you can get it from
    <http://www.freedesktop.org/wiki/Software/pkg-config>.

  - The OpenSSL library to calculate cryptographic hashes. If your
    distribution does not provide it, you can get it from
    <https://www.openssl.org>.

  - The `libbrotlienc` and `libbrotlidec` libraries to provide
    implementation of the Brotli compression algorithm. They are
    available for download from the official repository
    <https://github.com/google/brotli>.

  - The bzip2 compressor program and the `libbz2` library. Thus you must
    have bzip2 installed, including development headers and libraries.
    If your distribution does not provide these, you can obtain bzip2
    from
    <https://web.archive.org/web/20180624184756/http://www.bzip.org/>.

  - `liblzma`, which is provided by XZ Utils. If your distribution does
    not provide this, you can get it from <https://tukaani.org/xz/>.

  - cURL and its library. If your distribution does not provide it, you
    can get it from <https://curl.haxx.se/>.

  - The SQLite embedded database library, version 3.6.19 or higher. If
    your distribution does not provide it, please install it from
    <http://www.sqlite.org/>.

  - The [Boehm garbage collector](http://www.hboehm.info/gc/) to reduce
    the evaluator’s memory consumption (optional). To enable it, install
    `pkgconfig` and the Boehm garbage collector, and pass the flag
    `--enable-gc` to `configure`.

  - The `boost` library of version 1.66.0 or higher. It can be obtained
    from the official web site <https://www.boost.org/>.

  - The `editline` library of version 1.14.0 or higher. It can be
    obtained from the its repository
    <https://github.com/troglobit/editline>.

  - The `xmllint` and `xsltproc` programs to build this manual and the
    man-pages. These are part of the `libxml2` and `libxslt` packages,
    respectively. You also need the [DocBook XSL
    stylesheets](http://docbook.sourceforge.net/projects/xsl/) and
    optionally the [DocBook 5.0 RELAX NG
    schemas](http://www.docbook.org/schemas/5x). Note that these are
    only required if you modify the manual sources or when you are
    building from the Git repository.

  - Recent versions of Bison and Flex to build the parser. (This is
    because Nix needs GLR support in Bison and reentrancy support in
    Flex.) For Bison, you need version 2.6, which can be obtained from
    the [GNU FTP server](ftp://alpha.gnu.org/pub/gnu/bison). For Flex,
    you need version 2.5.35, which is available on
    [SourceForge](http://lex.sourceforge.net/). Slightly older versions
    may also work, but ancient versions like the ubiquitous 2.5.4a
    won't. Note that these are only required if you modify the parser or
    when you are building from the Git repository.

  - The `libseccomp` is used to provide syscall filtering on Linux. This
    is an optional dependency and can be disabled passing a
    `--disable-seccomp-sandboxing` option to the `configure` script (Not
    recommended unless your system doesn't support `libseccomp`). To get
    the library, visit <https://github.com/seccomp/libseccomp>.

## Obtaining a Source Distribution

The source tarball of the most recent stable release can be downloaded
from the [Nix homepage](http://nixos.org/nix/download.html). You can
also grab the [most recent development
release](http://hydra.nixos.org/job/nix/master/release/latest-finished#tabs-constituents).

Alternatively, the most recent sources of Nix can be obtained from its
[Git repository](https://github.com/NixOS/nix). For example, the
following command will check out the latest revision into a directory
called `nix`:

    $ git clone https://github.com/NixOS/nix

Likewise, specific releases can be obtained from the
[tags](https://github.com/NixOS/nix/tags) of the repository.

## Building Nix from Source

After unpacking or checking out the Nix sources, issue the following
commands:

    $ ./configure options...
    $ make
    $ make install

Nix requires GNU Make so you may need to invoke `gmake` instead.

When building from the Git repository, these should be preceded by the
command:

    $ ./bootstrap.sh

The installation path can be specified by passing the `--prefix=prefix`
to `configure`. The default installation directory is `/usr/local`. You
can change this to any location you like. You must have write permission
to the \<prefix\> path.

Nix keeps its *store* (the place where packages are stored) in
`/nix/store` by default. This can be changed using
`--with-store-dir=path`.

<div class="warning">

It is best *not* to change the Nix store from its default, since doing
so makes it impossible to use pre-built binaries from the standard
Nixpkgs channels — that is, all packages will need to be built from
source.

</div>

Nix keeps state (such as its database and log files) in `/nix/var` by
default. This can be changed using `--localstatedir=path`.

# Security

Nix has two basic security models. First, it can be used in “single-user
mode”, which is similar to what most other package management tools do:
there is a single user (typically `root`) who performs all package
management operations. All other users can then use the installed
packages, but they cannot perform package management operations
themselves.

Alternatively, you can configure Nix in “multi-user mode”. In this
model, all users can perform package management operations — for
instance, every user can install software without requiring root
privileges. Nix ensures that this is secure. For instance, it’s not
possible for one user to overwrite a package used by another user with a
Trojan horse.

## Single-User Mode

In single-user mode, all Nix operations that access the database in
`prefix/var/nix/db` or modify the Nix store in `prefix/store` must be
performed under the user ID that owns those directories. This is
typically `root`. (If you install from RPM packages, that’s in fact the
default ownership.) However, on single-user machines, it is often
convenient to `chown` those directories to your normal user account so
that you don’t have to `su` to `root` all the time.

## Multi-User Mode

To allow a Nix store to be shared safely among multiple users, it is
important that users are not able to run builders that modify the Nix
store or database in arbitrary ways, or that interfere with builds
started by other users. If they could do so, they could install a Trojan
horse in some package and compromise the accounts of other users.

To prevent this, the Nix store and database are owned by some privileged
user (usually `root`) and builders are executed under special user
accounts (usually named `nixbld1`, `nixbld2`, etc.). When a unprivileged
user runs a Nix command, actions that operate on the Nix store (such as
builds) are forwarded to a *Nix daemon* running under the owner of the
Nix store/database that performs the operation.

<div class="note">

Multi-user mode has one important limitation: only `root` and a set of
trusted users specified in `nix.conf` can specify arbitrary binary
caches. So while unprivileged users may install packages from arbitrary
Nix expressions, they may not get pre-built binaries.

</div>

### Setting up the build users

The *build users* are the special UIDs under which builds are performed.
They should all be members of the *build users group* `nixbld`. This
group should have no other members. The build users should not be
members of any other group. On Linux, you can create the group and users
as follows:

    $ groupadd -r nixbld
    $ for n in $(seq 1 10); do useradd -c "Nix build user $n" \
        -d /var/empty -g nixbld -G nixbld -M -N -r -s "$(which nologin)" \
        nixbld$n; done

This creates 10 build users. There can never be more concurrent builds
than the number of build users, so you may want to increase this if you
expect to do many builds at the same time.

### Running the daemon

The [Nix daemon](#sec-nix-daemon) should be started as follows (as
`root`):

    $ nix-daemon

You’ll want to put that line somewhere in your system’s boot scripts.

To let unprivileged users use the daemon, they should set the
[`NIX_REMOTE` environment variable](#envar-remote) to `daemon`. So you
should put a line like

    export NIX_REMOTE=daemon

into the users’ login scripts.

### Restricting access

To limit which users can perform Nix operations, you can use the
permissions on the directory `/nix/var/nix/daemon-socket`. For instance,
if you want to restrict the use of Nix to the members of a group called
`nix-users`, do

    $ chgrp nix-users /nix/var/nix/daemon-socket
    $ chmod ug=rwx,o= /nix/var/nix/daemon-socket

This way, users who are not in the `nix-users` group cannot connect to
the Unix domain socket `/nix/var/nix/daemon-socket/socket`, so they
cannot perform Nix operations.

# Environment Variables

To use Nix, some environment variables should be set. In particular,
`PATH` should contain the directories `prefix/bin` and
`~/.nix-profile/bin`. The first directory contains the Nix tools
themselves, while `~/.nix-profile` is a symbolic link to the current
*user environment* (an automatically generated package consisting of
symlinks to installed packages). The simplest way to set the required
environment variables is to include the file
`prefix/etc/profile.d/nix.sh` in your `~/.profile` (or similar), like
this:

    source prefix/etc/profile.d/nix.sh

## `NIX_SSL_CERT_FILE`

If you need to specify a custom certificate bundle to account for an
HTTPS-intercepting man in the middle proxy, you must specify the path to
the certificate bundle in the environment variable `NIX_SSL_CERT_FILE`.

If you don't specify a `NIX_SSL_CERT_FILE` manually, Nix will install
and use its own certificate bundle.

  - Set the environment variable and install Nix

        $ export NIX_SSL_CERT_FILE=/etc/ssl/my-certificate-bundle.crt
        $ sh <(curl https://nixos.org/nix/install)

  - In the shell profile and rc files (for example, `/etc/bashrc`,
    `/etc/zshrc`), add the following line:

        export NIX_SSL_CERT_FILE=/etc/ssl/my-certificate-bundle.crt

<div class="note">

You must not add the export and then do the install, as the Nix
installer will detect the presense of Nix configuration, and abort.

</div>

### `NIX_SSL_CERT_FILE` with macOS and the Nix daemon

On macOS you must specify the environment variable for the Nix daemon
service, then restart it:

    $ sudo launchctl setenv NIX_SSL_CERT_FILE /etc/ssl/my-certificate-bundle.crt
    $ sudo launchctl kickstart -k system/org.nixos.nix-daemon

### Proxy Environment Variables

The Nix installer has special handling for these proxy-related
environment variables: `http_proxy`, `https_proxy`, `ftp_proxy`,
`no_proxy`, `HTTP_PROXY`, `HTTPS_PROXY`, `FTP_PROXY`, `NO_PROXY`.

If any of these variables are set when running the Nix installer, then
the installer will create an override file at
`/etc/systemd/system/nix-daemon.service.d/override.conf` so `nix-daemon`
will use them.

# Upgrading Nix

Multi-user Nix users on macOS can upgrade Nix by running: `sudo -i sh -c
'nix-channel --update &&
nix-env -iA nixpkgs.nix &&
launchctl remove org.nixos.nix-daemon &&
launchctl load /Library/LaunchDaemons/org.nixos.nix-daemon.plist'`

Single-user installations of Nix should run this: `nix-channel --update;
nix-env -iA nixpkgs.nix nixpkgs.cacert`

Multi-user Nix users on Linux should run this with sudo: `nix-channel
--update; nix-env -iA nixpkgs.nix nixpkgs.cacert; systemctl
daemon-reload; systemctl restart nix-daemon`
