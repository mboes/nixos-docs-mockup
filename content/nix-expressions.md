This chapter shows you how to write Nix expressions, which instruct Nix
how to build packages. It starts with a simple example (a Nix expression
for GNU Hello), and then moves on to a more in-depth look at the Nix
expression language.

<div class="note">

This chapter is mostly about the Nix expression language. For more
extensive information on adding packages to the Nix Packages collection
(such as functions in the standard environment and coding conventions),
please consult [its manual](http://nixos.org/nixpkgs/manual/).

</div>

# A Simple Nix Expression

This section shows how to add and test the [GNU Hello
package](http://www.gnu.org/software/hello/hello.html) to the Nix
Packages collection. Hello is a program that prints out the text “Hello,
world\!”.

To add a package to the Nix Packages collection, you generally need to
do three things:

1.  Write a Nix expression for the package. This is a file that
    describes all the inputs involved in building the package, such as
    dependencies, sources, and so on.

2.  Write a *builder*. This is a shell script\[2\] that actually builds
    the package from the inputs.

3.  Add the package to the file `pkgs/top-level/all-packages.nix`. The
    Nix expression written in the first step is a *function*; it
    requires other packages in order to build it. In this step you put
    it all together, i.e., you call the function with the right
    arguments to build the actual package.

## Expression Syntax

    { stdenv, fetchurl, perl }:

    stdenv.mkDerivation {
      name = "hello-2.1.1";
      builder = ./builder.sh;
      src = fetchurl {
        url = "ftp://ftp.nluug.nl/pub/gnu/hello/hello-2.1.1.tar.gz";
        sha256 = "1md7jsfd8pa45z73bz1kszpp01yw6x5ljkjk2hx7wl800any6465";
      };
      inherit perl;
    }

[example\_title](#ex-hello-nix) shows a Nix expression for GNU Hello.
It's actually already in the Nix Packages collection in
`pkgs/applications/misc/hello/ex-1/default.nix`. It is customary to
place each package in a separate directory and call the single Nix
expression in that directory `default.nix`. The file has the following
elements (referenced from the figure by number):

  - This states that the expression is a *function* that expects to be
    called with three arguments: `stdenv`, `fetchurl`, and `perl`. They
    are needed to build Hello, but we don't know how to build them here;
    that's why they are function arguments. `stdenv` is a package that
    is used by almost all Nix Packages packages; it provides a
    “standard” environment consisting of the things you would expect
    in a basic Unix environment: a C/C++ compiler (GCC, to be precise),
    the Bash shell, fundamental Unix tools such as `cp`, `grep`, `tar`,
    etc. `fetchurl` is a function that downloads files. `perl` is the
    Perl interpreter.

    Nix functions generally have the form `{ x, y, ...,
                    z }: e` where `x`, `y`, etc. are the names of the expected
    arguments, and where \<e\> is the body of the function. So here, the
    entire remainder of the file is the body of the function; when given
    the required arguments, the body should describe how to build an
    instance of the Hello package.

  - So we have to build a package. Building something from other stuff
    is called a *derivation* in Nix (as opposed to sources, which are
    built by humans instead of computers). We perform a derivation by
    calling `stdenv.mkDerivation`. `mkDerivation` is a function provided
    by `stdenv` that builds a package from a set of *attributes*. A set
    is just a list of key/value pairs where each key is a string and
    each value is an arbitrary Nix expression. They take the general
    form `{
                    name1 =
                    expr1; ...
                    nameN =
                    exprN; }`.

  - The attribute `name` specifies the symbolic name and version of the
    package. Nix doesn't really care about these things, but they are
    used by for instance `nix-env
                    -q` to show a “human-readable” name for packages. This attribute is
    required by `mkDerivation`.

  - The attribute `builder` specifies the builder. This attribute can
    sometimes be omitted, in which case `mkDerivation` will fill in a
    default builder (which does a `configure; make; make install`, in
    essence). Hello is sufficiently simple that the default builder
    would suffice, but in this case, we will show an actual builder for
    educational purposes. The value `./builder.sh` refers to the shell
    script shown in [example\_title](#ex-hello-builder), discussed
    below.

  - The builder has to know what the sources of the package are. Here,
    the attribute `src` is bound to the result of a call to the
    `fetchurl` function. Given a URL and a SHA-256 hash of the expected
    contents of the file at that URL, this function builds a derivation
    that downloads the file and checks its hash. So the sources are a
    dependency that like all other dependencies is built before Hello
    itself is built.

    Instead of `src` any other name could have been used, and in fact
    there can be any number of sources (bound to different attributes).
    However, `src` is customary, and it's also expected by the default
    builder (which we don't use in this example).

  - Since the derivation requires Perl, we have to pass the value of the
    `perl` function argument to the builder. All attributes in the set
    are actually passed as environment variables to the builder, so
    declaring an attribute

        perl = perl;

    will do the trick: it binds an attribute `perl` to the function
    argument which also happens to be called `perl`. However, it looks a
    bit silly, so there is a shorter syntax. The `inherit` keyword
    causes the specified attributes to be bound to whatever variables
    with the same name happen to be in scope.

## Build Script

    source $stdenv/setup

    PATH=$perl/bin:$PATH

    tar xvfz $src
    cd hello-*
    ./configure --prefix=$out
    make
    make install

[example\_title](#ex-hello-builder) shows the builder referenced from
Hello's Nix expression (stored in
`pkgs/applications/misc/hello/ex-1/builder.sh`). The builder can
actually be made a lot shorter by using the *generic builder* functions
provided by `stdenv`, but here we write out the build steps to elucidate
what a builder does. It performs the following steps:

  - When Nix runs a builder, it initially completely clears the
    environment (except for the attributes declared in the derivation).
    For instance, the `PATH` variable is empty\[3\]. This is done to
    prevent undeclared inputs from being used in the build process. If
    for example the `PATH` contained `/usr/bin`, then you might
    accidentally use `/usr/bin/gcc`.

    So the first step is to set up the environment. This is done by
    calling the `setup` script of the standard environment. The
    environment variable `stdenv` points to the location of the standard
    environment being used. (It wasn't specified explicitly as an
    attribute in [example\_title](#ex-hello-nix), but `mkDerivation`
    adds it automatically.)

  - Since Hello needs Perl, we have to make sure that Perl is in the
    `PATH`. The `perl` environment variable points to the location of
    the Perl package (since it was passed in as an attribute to the
    derivation), so `$perl/bin` is the directory containing the Perl
    interpreter.

  - Now we have to unpack the sources. The `src` attribute was bound to
    the result of fetching the Hello source tarball from the network, so
    the `src` environment variable points to the location in the Nix
    store to which the tarball was downloaded. After unpacking, we `cd`
    to the resulting source directory.

    The whole build is performed in a temporary directory created in
    `/tmp`, by the way. This directory is removed after the builder
    finishes, so there is no need to clean up the sources afterwards.
    Also, the temporary directory is always newly created, so you don't
    have to worry about files from previous builds interfering with the
    current build.

  - GNU Hello is a typical Autoconf-based package, so we first have to
    run its `configure` script. In Nix every package is stored in a
    separate location in the Nix store, for instance
    `/nix/store/9a54ba97fb71b65fda531012d0443ce2-hello-2.1.1`. Nix
    computes this path by cryptographically hashing all attributes of
    the derivation. The path is passed to the builder through the `out`
    environment variable. So here we give `configure` the parameter
    `--prefix=$out` to cause Hello to be installed in the expected
    location.

  - Finally we build Hello (`make`) and install it into the location
    specified by `out` (`make install`).

If you are wondering about the absence of error checking on the result
of various commands called in the builder: this is because the shell
script is evaluated with Bash's `-e` option, which causes the script to
be aborted if any command fails without an error check.

## Arguments and Variables

    ...

    rec {

      hello = import ../applications/misc/hello/ex-1  {
        inherit fetchurl stdenv perl;
      };

      perl = import ../development/interpreters/perl {
        inherit fetchurl stdenv;
      };

      fetchurl = import ../build-support/fetchurl {
        inherit stdenv; ...
      };

      stdenv = ...;

    }

The Nix expression in [example\_title](#ex-hello-nix) is a function; it
is missing some arguments that have to be filled in somewhere. In the
Nix Packages collection this is done in the file
`pkgs/top-level/all-packages.nix`, where all Nix expressions for
packages are imported and called with the appropriate arguments.
[example\_title](#ex-hello-composition) shows some fragments of
`all-packages.nix`.

  - This file defines a set of attributes, all of which are concrete
    derivations (i.e., not functions). In fact, we define a *mutually
    recursive* set of attributes. That is, the attributes can refer to
    each other. This is precisely what we want since we want to “plug”
    the various packages into each other.

  - Here we *import* the Nix expression for GNU Hello. The import
    operation just loads and returns the specified Nix expression. In
    fact, we could just have put the contents of
    [example\_title](#ex-hello-nix) in `all-packages.nix` at this point.
    That would be completely equivalent, but it would make the file
    rather bulky.

    Note that we refer to `../applications/misc/hello/ex-1`, not
    `../applications/misc/hello/ex-1/default.nix`. When you try to
    import a directory, Nix automatically appends `/default.nix` to the
    file name.

  - This is where the actual composition takes place. Here we *call* the
    function imported from `../applications/misc/hello/ex-1` with a set
    containing the things that the function expects, namely `fetchurl`,
    `stdenv`, and `perl`. We use inherit again to use the attributes
    defined in the surrounding scope (we could also have written
    `fetchurl = fetchurl;`, etc.).

    The result of this function call is an actual derivation that can be
    built by Nix (since when we fill in the arguments of the function,
    what we get is its body, which is the call to `stdenv.mkDerivation`
    in [example\_title](#ex-hello-nix)).

    <div class="note">

    Nixpkgs has a convenience function `callPackage` that imports and
    calls a function, filling in any missing arguments by passing the
    corresponding attribute from the Nixpkgs set, like this:

        hello = callPackage ../applications/misc/hello/ex-1 { };

    If necessary, you can set or override arguments:

        hello = callPackage ../applications/misc/hello/ex-1 { stdenv = myStdenv; };

    </div>

  - Likewise, we have to instantiate Perl, `fetchurl`, and the standard
    environment.

## Building and Testing

You can now try to build Hello. Of course, you could do `nix-env -i
hello`, but you may not want to install a possibly broken package just
yet. The best way to test the package is by using the command
`nix-build`, which builds a Nix expression and creates a symlink named
`result` in the current directory:

    $ nix-build -A hello
    building path `/nix/store/632d2b22514d...-hello-2.1.1'
    hello-2.1.1/
    hello-2.1.1/intl/
    hello-2.1.1/intl/ChangeLog
    ...

    $ ls -l result
    lrwxrwxrwx ... 2006-09-29 10:43 result -> /nix/store/632d2b22514d...-hello-2.1.1

    $ ./result/bin/hello
    Hello, world!

The [`-A`](#opt-attr) option selects the `hello` attribute. This is
faster than using the symbolic package name specified by the `name`
attribute (which also happens to be `hello`) and is unambiguous (there
can be multiple packages with the symbolic name `hello`, but there can
be only one attribute in a set named `hello`).

`nix-build` registers the `./result` symlink as a garbage collection
root, so unless and until you delete the `./result` symlink, the output
of the build will be safely kept on your system. You can use
`nix-build`’s `-o` switch to give the symlink another name.

Nix has transactional semantics. Once a build finishes successfully, Nix
makes a note of this in its database: it registers that the path denoted
by `out` is now “valid”. If you try to build the derivation again, Nix
will see that the path is already valid and finish immediately. If a
build fails, either because it returns a non-zero exit code, because Nix
or the builder are killed, or because the machine crashes, then the
output paths will not be registered as valid. If you try to build the
derivation again, Nix will remove the output paths if they exist (e.g.,
because the builder died half-way through `make
install`) and try again. Note that there is no “negative caching”: Nix
doesn't remember that a build failed, and so a failed build can always
be repeated. This is because Nix cannot distinguish between permanent
failures (e.g., a compiler error due to a syntax error in the source)
and transient failures (e.g., a disk full condition).

Nix also performs locking. If you run multiple Nix builds
simultaneously, and they try to build the same derivation, the first Nix
instance that gets there will perform the build, while the others block
(or perform other derivations if available) until the build finishes:

    $ nix-build -A hello
    waiting for lock on `/nix/store/0h5b7hp8d4hqfrw8igvx97x1xawrjnac-hello-2.1.1x'

So it is always safe to run multiple instances of Nix in parallel (which
isn’t the case with, say, `make`).

## Generic Builder Syntax

Recall from [example\_title](#ex-hello-builder) that the builder looked
something like this:

    PATH=$perl/bin:$PATH
    tar xvfz $src
    cd hello-*
    ./configure --prefix=$out
    make
    make install

The builders for almost all Unix packages look like this — set up some
environment variables, unpack the sources, configure, build, and
install. For this reason the standard environment provides some Bash
functions that automate the build process. A builder using the generic
build facilities in shown in [example\_title](#ex-hello-builder2).

    buildInputs="$perl"

    source $stdenv/setup

    genericBuild

  - The `buildInputs` variable tells `setup` to use the indicated
    packages as “inputs”. This means that if a package provides a `bin`
    subdirectory, it's added to `PATH`; if it has a `include`
    subdirectory, it's added to GCC's header search path; and so
    on.\[4\]

  - The function `genericBuild` is defined in the file `$stdenv/setup`.

  - The final step calls the shell function `genericBuild`, which
    performs the steps that were done explicitly in
    [example\_title](#ex-hello-builder). The generic builder is smart
    enough to figure out whether to unpack the sources using `gzip`,
    `bzip2`, etc. It can be customised in many ways; see the Nixpkgs
    manual for details.

Discerning readers will note that the `buildInputs` could just as well
have been set in the Nix expression, like this:

```
  buildInputs = [ perl ];
```

The `perl` attribute can then be removed, and the builder becomes even
shorter:

    source $stdenv/setup
    genericBuild

In fact, `mkDerivation` provides a default builder that looks exactly
like that, so it is actually possible to omit the builder for Hello
entirely.

# Nix Expression Language

The Nix expression language is a pure, lazy, functional language. Purity
means that operations in the language don't have side-effects (for
instance, there is no variable assignment). Laziness means that
arguments to functions are evaluated only when they are needed.
Functional means that functions are “normal” values that can be passed
around and manipulated in interesting ways. The language is not a
full-featured, general purpose language. Its main job is to describe
packages, compositions of packages, and the variability within packages.

This section presents the various features of the language.

## Values

### Simple Values

Nix has the following basic data types:

  - *Strings* can be written in three ways.

    The most common way is to enclose the string between double quotes,
    e.g., `"foo bar"`. Strings can span multiple lines. The special
    characters `"` and `\` and the character sequence `${` must be
    escaped by prefixing them with a backslash (`\`). Newlines, carriage
    returns and tabs can be written as `\n`, `\r` and `\t`,
    respectively.

    You can include the result of an expression into a string by
    enclosing it in `${...}`, a feature known as *antiquotation*. The
    enclosed expression must evaluate to something that can be coerced
    into a string (meaning that it must be a string, a path, or a
    derivation). For instance, rather than writing

        "--with-freetype2-library=" + freetype + "/lib"

    (where `freetype` is a derivation), you can instead write the more
    natural

        "--with-freetype2-library=${freetype}/lib"

    The latter is automatically translated to the former. A more
    complicated example (from the Nix expression for
    [Qt](http://www.trolltech.com/products/qt)):

        configureFlags = "
          -system-zlib -system-libpng -system-libjpeg
          ${if openglSupport then "-dlopen-opengl
            -L${mesa}/lib -I${mesa}/include
            -L${libXmu}/lib -I${libXmu}/include" else ""}
          ${if threadSupport then "-thread" else "-no-thread"}
        ";

    Note that Nix expressions and strings can be arbitrarily nested; in
    this case the outer string contains various antiquotations that
    themselves contain strings (e.g., `"-thread"`), some of which in
    turn contain expressions (e.g., `${mesa}`).

    The second way to write string literals is as an *indented string*,
    which is enclosed between pairs of *double single-quotes*, like so:

        ''
          This is the first line.
          This is the second line.
            This is the third line.
        ''

    This kind of string literal intelligently strips indentation from
    the start of each line. To be precise, it strips from each line a
    number of spaces equal to the minimal indentation of the string as a
    whole (disregarding the indentation of empty lines). For instance,
    the first and second line are indented two space, while the third
    line is indented four spaces. Thus, two spaces are stripped from
    each line, so the resulting string is

        "This is the first line.\nThis is the second line.\n  This is the third line.\n"

    Note that the whitespace and newline following the opening `''` is
    ignored if there is no non-whitespace text on the initial line.

    Antiquotation (`${expr}`) is supported in indented strings.

    Since `${` and `''` have special meaning in indented strings, you
    need a way to quote them. `$` can be escaped by prefixing it with
    `''` (that is, two single quotes), i.e., `''$`. `''` can be escaped
    by prefixing it with `'`, i.e., `'''`. `$` removes any special
    meaning from the following `$`. Linefeed, carriage-return and tab
    characters can be written as `''\n`, `''\r`, `''\t`, and `''\`
    escapes any other character.

    Indented strings are primarily useful in that they allow multi-line
    string literals to follow the indentation of the enclosing Nix
    expression, and that less escaping is typically necessary for
    strings representing languages such as shell scripts and
    configuration files because `''` is much less common than `"`.
    Example:

        stdenv.mkDerivation {
          ...
          postInstall =
            ''
              mkdir $out/bin $out/etc
              cp foo $out/bin
              echo "Hello World" > $out/etc/foo.conf
              ${if enableBar then "cp bar $out/bin" else ""}
            '';
          ...
        }

    Finally, as a convenience, *URIs* as defined in appendix B of
    [RFC 2396](http://www.ietf.org/rfc/rfc2396.txt) can be written *as
    is*, without quotes. For instance, the string
    `"http://example.org/foo.tar.bz2"` can also be written as
    `http://example.org/foo.tar.bz2`.

  - Numbers, which can be *integers* (like `123`) or *floating point*
    (like `123.43` or `.27e13`).

    Numbers are type-compatible: pure integer operations will always
    return integers, whereas any operation involving at least one
    floating point number will have a floating point number as a result.

  - *Paths*, e.g., `/bin/sh` or `./builder.sh`. A path must contain at
    least one slash to be recognised as such; for instance, `builder.sh`
    is not a path\[5\]. If the file name is relative, i.e., if it does
    not begin with a slash, it is made absolute at parse time relative
    to the directory of the Nix expression that contained it. For
    instance, if a Nix expression in `/foo/bar/bla.nix` refers to
    `../xyzzy/fnord.nix`, the absolute path is `/foo/xyzzy/fnord.nix`.

    If the first component of a path is a `~`, it is interpreted as if
    the rest of the path were relative to the user's home directory.
    e.g. `~/foo` would be equivalent to `/home/edolstra/foo` for a user
    whose home directory is `/home/edolstra`.

    Paths can also be specified between angle brackets, e.g.
    `<nixpkgs>`. This means that the directories listed in the
    environment variable `NIX_PATH` will be searched for the given file
    or directory name.

  - *Booleans* with values `true` and `false`.

  - The null value, denoted as `null`.

### Lists

Lists are formed by enclosing a whitespace-separated list of values
between square brackets. For example,

    [ 123 ./foo.nix "abc" (f { x = y; }) ]

defines a list of four elements, the last being the result of a call to
the function `f`. Note that function calls have to be enclosed in
parentheses. If they had been omitted, e.g.,

    [ 123 ./foo.nix "abc" f { x = y; } ]

the result would be a list of five elements, the fourth one being a
function and the fifth being a set.

Note that lists are only lazy in values, and they are strict in length.

### Sets

Sets are really the core of the language, since ultimately the Nix
language is all about creating derivations, which are really just sets
of attributes to be passed to build scripts.

Sets are just a list of name/value pairs (called *attributes*) enclosed
in curly brackets, where each value is an arbitrary expression
terminated by a semicolon. For example:

    { x = 123;
      text = "Hello";
      y = f { bla = 456; };
    }

This defines a set with attributes named `x`, `text`, `y`. The order of
the attributes is irrelevant. An attribute name may only occur once.

Attributes can be selected from a set using the `.` operator. For
instance,

    { a = "Foo"; b = "Bar"; }.a

evaluates to `"Foo"`. It is possible to provide a default value in an
attribute selection using the `or` keyword. For example,

    { a = "Foo"; b = "Bar"; }.c or "Xyzzy"

will evaluate to `"Xyzzy"` because there is no `c` attribute in the set.

You can use arbitrary double-quoted strings as attribute names:

    { "foo ${bar}" = 123; "nix-1.0" = 456; }."foo ${bar}"

This will evaluate to `123` (Assuming `bar` is antiquotable). In the
case where an attribute name is just a single antiquotation, the quotes
can be dropped:

    { foo = 123; }.${bar} or 456

This will evaluate to `123` if `bar` evaluates to `"foo"` when coerced
to a string and `456` otherwise (again assuming `bar` is antiquotable).

In the special case where an attribute name inside of a set declaration
evaluates to `null` (which is normally an error, as `null` is not
antiquotable), that attribute is simply not added to the set:

    { ${if foo then "bar" else null} = true; }

This will evaluate to `{}` if `foo` evaluates to `false`.

A set that has a `__functor` attribute whose value is callable (i.e. is
itself a function or a set with a `__functor` attribute whose value is
callable) can be applied as if it were a function, with the set itself
passed in first , e.g.,

    let add = { __functor = self: x: x + self.x; };
        inc = add // { x = 1; };
    in inc 1

evaluates to `2`. This can be used to attach metadata to a function
without the caller needing to treat it specially, or to implement a form
of object-oriented programming, for example.

## Language Constructs

### Recursive sets

Recursive sets are just normal sets, but the attributes can refer to
each other. For example,

    rec {
      x = y;
      y = 123;
    }.x

evaluates to `123`. Note that without `rec` the binding `x = y;` would
refer to the variable `y` in the surrounding scope, if one exists, and
would be invalid if no such variable exists. That is, in a normal
(non-recursive) set, attributes are not added to the lexical scope; in a
recursive set, they are.

Recursive sets of course introduce the danger of infinite recursion. For
example,

    rec {
      x = y;
      y = x;
    }.x

does not terminate\[6\].

### Let-expressions

A let-expression allows you to define local variables for an expression.
For instance,

    let
      x = "foo";
      y = "bar";
    in x + y

evaluates to `"foobar"`.

### Inheriting attributes

When defining a set or in a let-expression it is often convenient to
copy variables from the surrounding lexical scope (e.g., when you want
to propagate attributes). This can be shortened using the `inherit`
keyword. For instance,

    let x = 123; in
    { inherit x;
      y = 456;
    }

is equivalent to

    let x = 123; in
    { x = x;
      y = 456;
    }

and both evaluate to `{ x = 123; y = 456; }`. (Note that this works
because `x` is added to the lexical scope by the `let` construct.) It is
also possible to inherit attributes from another set. For instance, in
this fragment from `all-packages.nix`,

```
  graphviz = (import ../tools/graphics/graphviz) {
    inherit fetchurl stdenv libpng libjpeg expat x11 yacc;
    inherit (xlibs) libXaw;
  };

  xlibs = {
    libX11 = ...;
    libXaw = ...;
    ...
  }

  libpng = ...;
  libjpg = ...;
  ...
```

the set used in the function call to the function defined in
`../tools/graphics/graphviz` inherits a number of variables from the
surrounding scope (`fetchurl` ... `yacc`), but also inherits `libXaw`
(the X Athena Widgets) from the `xlibs` (X11 client-side libraries) set.

Summarizing the fragment

    ...
    inherit x y z;
    inherit (src-set) a b c;
    ...

is equivalent to

    ...
    x = x; y = y; z = z;
    a = src-set.a; b = src-set.b; c = src-set.c;
    ...

when used while defining local variables in a let-expression or while
defining a set.

### Functions

Functions have the following form:

    pattern: body

The pattern specifies what the argument of the function must look like,
and binds variables in the body to (parts of) the argument. There are
three kinds of patterns:

  - If a pattern is a single identifier, then the function matches any
    argument. Example:

        let negate = x: !x;
            concat = x: y: x + y;
        in if negate true then concat "foo" "bar" else ""

    Note that `concat` is a function that takes one argument and returns
    a function that takes another argument. This allows partial
    parameterisation (i.e., only filling some of the arguments of a
    function); e.g.,

        map (concat "foo") [ "bar" "bla" "abc" ]

    evaluates to `[ "foobar" "foobla"
            "fooabc" ]`.

  - A *set pattern* of the form `{ name1, name2, …, nameN }` matches a
    set containing the listed attributes, and binds the values of those
    attributes to variables in the function body. For example, the
    function

        { x, y, z }: z + y + x

    can only be called with a set containing exactly the attributes `x`,
    `y` and `z`. No other attributes are allowed. If you want to allow
    additional arguments, you can use an ellipsis (`...`):

        { x, y, z, ... }: z + y + x

    This works on any set that contains at least the three named
    attributes.

    It is possible to provide *default values* for attributes, in which
    case they are allowed to be missing. A default value is specified by
    writing `name ?
            e`, where \<e\> is an arbitrary expression. For example,

        { x, y ? "foo", z ? "bar" }: z + y + x

    specifies a function that only requires an attribute named `x`, but
    optionally accepts `y` and `z`.

  - An `@`-pattern provides a means of referring to the whole value
    being matched:

    ```
     args@{ x, y, z, ... }: z + y + x + args.a
    ```

    but can also be written as:

    ```
     { x, y, z, ... } @ args: z + y + x + args.a
    ```

    Here `args` is bound to the entire argument, which is further
    matched against the pattern `{ x, y, z,
            ... }`. `@`-pattern makes mainly sense with an ellipsis(`...`) as
    you can access attribute names as `a`, using `args.a`, which was
    given as an additional attribute to the function.

    <div class="warning">

    The `args@` expression is bound to the argument passed to the
    function which means that attributes with defaults that aren't
    explicitly specified in the function call won't cause an evaluation
    error, but won't exist in `args`.

    For instance

        let
          function = args@{ a ? 23, ... }: args;
        in
         function {}

    will evaluate to an empty attribute set.

    </div>

Note that functions do not have names. If you want to give them a name,
you can bind them to an attribute, e.g.,

    let concat = { x, y }: x + y;
    in concat { x = "foo"; y = "bar"; }

### Conditionals

Conditionals look like this:

    if e1 then e2 else e3

where \<e1\> is an expression that should evaluate to a Boolean value
(`true` or `false`).

### Assertions

Assertions are generally used to check that certain requirements on or
between features and dependencies hold. They look like this:

    assert e1; e2

where \<e1\> is an expression that should evaluate to a Boolean value.
If it evaluates to `true`, \<e2\> is returned; otherwise expression
evaluation is aborted and a backtrace is printed.

    { localServer ? false
    , httpServer ? false
    , sslSupport ? false
    , pythonBindings ? false
    , javaSwigBindings ? false
    , javahlBindings ? false
    , stdenv, fetchurl
    , openssl ? null, httpd ? null, db4 ? null, expat, swig ? null, j2sdk ? null
    }:

    assert localServer -> db4 != null;
    assert httpServer -> httpd != null && httpd.expat == expat;
    assert sslSupport -> openssl != null && (httpServer -> httpd.openssl == openssl);
    assert pythonBindings -> swig != null && swig.pythonSupport;
    assert javaSwigBindings -> swig != null && swig.javaSupport;
    assert javahlBindings -> j2sdk != null;

    stdenv.mkDerivation {
      name = "subversion-1.1.1";
      ...
      openssl = if sslSupport then openssl else null;
      ...
    }

[example\_title](#ex-subversion-nix) show how assertions are used in the
Nix expression for Subversion.

  - This assertion states that if Subversion is to have support for
    local repositories, then Berkeley DB is needed. So if the Subversion
    function is called with the `localServer` argument set to `true` but
    the `db4` argument set to `null`, then the evaluation fails.

  - This is a more subtle condition: if Subversion is built with Apache
    (`httpServer`) support, then the Expat library (an XML library) used
    by Subversion should be same as the one used by Apache. This is
    because in this configuration Subversion code ends up being linked
    with Apache code, and if the Expat libraries do not match, a build-
    or runtime link error or incompatibility might occur.

  - This assertion says that in order for Subversion to have SSL support
    (so that it can access `https` URLs), an OpenSSL library must be
    passed. Additionally, it says that *if* Apache support is enabled,
    then Apache's OpenSSL should match Subversion's. (Note that if
    Apache support is not enabled, we don't care about Apache's
    OpenSSL.)

  - The conditional here is not really related to assertions, but is
    worth pointing out: it ensures that if SSL support is disabled, then
    the Subversion derivation is not dependent on OpenSSL, even if a
    non-`null` value was passed. This prevents an unnecessary rebuild of
    Subversion if OpenSSL changes.

### With-expressions

A *with-expression*,

    with e1; e2

introduces the set \<e1\> into the lexical scope of the expression
\<e2\>. For instance,

    let as = { x = "foo"; y = "bar"; };
    in with as; x + y

evaluates to `"foobar"` since the `with` adds the `x` and `y` attributes
of `as` to the lexical scope in the expression `x + y`. The most common
use of `with` is in conjunction with the `import` function. E.g.,

    with (import ./definitions.nix); ...

makes all attributes defined in the file `definitions.nix` available as
if they were defined locally in a `let`-expression.

The bindings introduced by `with` do not shadow bindings introduced by
other means, e.g.

    let a = 3; in with { a = 1; }; let a = 4; in with { a = 2; }; ...

establishes the same scope as

    let a = 1; in let a = 2; in let a = 3; in let a = 4; in ...

### Comments

Comments can be single-line, started with a `#` character, or
inline/multi-line, enclosed within `/*
... */`.

## Operators

[table\_title](#table-operators) lists the operators in the Nix
expression language, in order of precedence (from strongest to weakest
binding).

<table>
<caption>Operators</caption>
<thead>
<tr class="header">
<th>Name</th>
<th>Syntax</th>
<th>Associativity</th>
<th>Description</th>
<th>Precedence</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Select</td>
<td>&lt;e&gt; <code>.</code> &lt;attrpath&gt; [ <code>or</code> &lt;def&gt; ]</td>
<td>none</td>
<td>Select attribute denoted by the attribute path &lt;attrpath&gt; from set &lt;e&gt;. (An attribute path is a dot-separated list of attribute names.) If the attribute doesn’t exist, return &lt;def&gt; if provided, otherwise abort evaluation.</td>
<td>1</td>
</tr>
<tr class="even">
<td>Application</td>
<td>&lt;e1&gt; &lt;e2&gt;</td>
<td>left</td>
<td>Call function &lt;e1&gt; with argument &lt;e2&gt;.</td>
<td>2</td>
</tr>
<tr class="odd">
<td>Arithmetic Negation</td>
<td><code>-</code> &lt;e&gt;</td>
<td>none</td>
<td>Arithmetic negation.</td>
<td>3</td>
</tr>
<tr class="even">
<td>Has Attribute</td>
<td>&lt;e&gt; <code>?</code> &lt;attrpath&gt;</td>
<td>none</td>
<td>Test whether set &lt;e&gt; contains the attribute denoted by &lt;attrpath&gt;; return <code>true</code> or <code>false</code>.</td>
<td>4</td>
</tr>
<tr class="odd">
<td>List Concatenation</td>
<td>&lt;e1&gt; <code>++</code> &lt;e2&gt;</td>
<td>right</td>
<td>List concatenation.</td>
<td>5</td>
</tr>
<tr class="even">
<td>Multiplication</td>
<td>&lt;e1&gt; <code>*</code> &lt;e2&gt;,</td>
<td>left</td>
<td>Arithmetic multiplication.</td>
<td>6</td>
</tr>
<tr class="odd">
<td>Division</td>
<td>&lt;e1&gt; <code>/</code> &lt;e2&gt;</td>
<td>left</td>
<td>Arithmetic division.</td>
<td>6</td>
</tr>
<tr class="even">
<td>Addition</td>
<td>&lt;e1&gt; <code>+</code> &lt;e2&gt;</td>
<td>left</td>
<td>Arithmetic addition.</td>
<td>7</td>
</tr>
<tr class="odd">
<td>Subtraction</td>
<td>&lt;e1&gt; <code>-</code> &lt;e2&gt;</td>
<td>left</td>
<td>Arithmetic subtraction.</td>
<td>7</td>
</tr>
<tr class="even">
<td>String Concatenation</td>
<td>&lt;string1&gt; <code>+</code> &lt;string2&gt;</td>
<td>left</td>
<td>String concatenation.</td>
<td>7</td>
</tr>
<tr class="odd">
<td>Not</td>
<td><code>!</code> &lt;e&gt;</td>
<td>none</td>
<td>Boolean negation.</td>
<td>8</td>
</tr>
<tr class="even">
<td>Update</td>
<td>&lt;e1&gt; <code>//</code> &lt;e2&gt;</td>
<td>right</td>
<td>Return a set consisting of the attributes in &lt;e1&gt; and &lt;e2&gt; (with the latter taking precedence over the former in case of equally named attributes).</td>
<td>9</td>
</tr>
<tr class="odd">
<td>Less Than</td>
<td>&lt;e1&gt; <code>&lt;</code> &lt;e2&gt;,</td>
<td>none</td>
<td>Arithmetic comparison.</td>
<td>10</td>
</tr>
<tr class="even">
<td>Less Than or Equal To</td>
<td>&lt;e1&gt; <code>&lt;=</code> &lt;e2&gt;</td>
<td>none</td>
<td>Arithmetic comparison.</td>
<td>10</td>
</tr>
<tr class="odd">
<td>Greater Than</td>
<td>&lt;e1&gt; <code>&gt;</code> &lt;e2&gt;</td>
<td>none</td>
<td>Arithmetic comparison.</td>
<td>10</td>
</tr>
<tr class="even">
<td>Greater Than or Equal To</td>
<td>&lt;e1&gt; <code>&gt;=</code> &lt;e2&gt;</td>
<td>none</td>
<td>Arithmetic comparison.</td>
<td>10</td>
</tr>
<tr class="odd">
<td>Equality</td>
<td>&lt;e1&gt; <code>==</code> &lt;e2&gt;</td>
<td>none</td>
<td>Equality.</td>
<td>11</td>
</tr>
<tr class="even">
<td>Inequality</td>
<td>&lt;e1&gt; <code>!=</code> &lt;e2&gt;</td>
<td>none</td>
<td>Inequality.</td>
<td>11</td>
</tr>
<tr class="odd">
<td>Logical AND</td>
<td>&lt;e1&gt; <code>&amp;&amp;</code> &lt;e2&gt;</td>
<td>left</td>
<td>Logical AND.</td>
<td>12</td>
</tr>
<tr class="even">
<td>Logical OR</td>
<td>&lt;e1&gt; <code>||</code> &lt;e2&gt;</td>
<td>left</td>
<td>Logical OR.</td>
<td>13</td>
</tr>
<tr class="odd">
<td>Logical Implication</td>
<td>&lt;e1&gt; <code>-&gt;</code> &lt;e2&gt;</td>
<td>none</td>
<td>Logical implication (equivalent to <code>!e1 ||
        e2</code>).</td>
<td>14</td>
</tr>
</tbody>
</table>

## Derivations

The most important built-in function is `derivation`, which is used to
describe a single derivation (a build action). It takes as input a set,
the attributes of which specify the inputs of the build.

  - There must be an attribute named `system` whose value must be a
    string specifying a Nix platform identifier, such as `"i686-linux"`
    or `"x86_64-darwin"`\[7\] The build can only be performed on a
    machine and operating system matching the platform identifier. (Nix
    can automatically forward builds for other platforms by forwarding
    them to other machines; see [Remote
    Builds](#chap-distributed-builds).)

  - There must be an attribute named `name` whose value must be a
    string. This is used as a symbolic name for the package by
    `nix-env`, and it is appended to the output paths of the derivation.

  - There must be an attribute named `builder` that identifies the
    program that is executed to perform the build. It can be either a
    derivation or a source (a local file reference, e.g.,
    `./builder.sh`).

  - Every attribute is passed as an environment variable to the builder.
    Attribute values are translated to environment variables as follows:

      - Strings and numbers are just passed verbatim.

      - A *path* (e.g., `../foo/sources.tar`) causes the referenced file
        to be copied to the store; its location in the store is put in
        the environment variable. The idea is that all sources should
        reside in the Nix store, since all inputs to a derivation should
        reside in the Nix store.

      - A *derivation* causes that derivation to be built prior to the
        present derivation; its default output path is put in the
        environment variable.

      - Lists of the previous types are also allowed. They are simply
        concatenated, separated by spaces.

      - `true` is passed as the string `1`, `false` and `null` are
        passed as an empty string.

  - The optional attribute `args` specifies command-line arguments to be
    passed to the builder. It should be a list.

  - The optional attribute `outputs` specifies a list of symbolic
    outputs of the derivation. By default, a derivation produces a
    single output path, denoted as `out`. However, derivations can
    produce multiple output paths. This is useful because it allows
    outputs to be downloaded or garbage-collected separately. For
    instance, imagine a library package that provides a dynamic library,
    header files, and documentation. A program that links against the
    library doesn’t need the header files and documentation at runtime,
    and it doesn’t need the documentation at build time. Thus, the
    library package could specify:

        outputs = [ "lib" "headers" "doc" ];

    This will cause Nix to pass environment variables `lib`, `headers`
    and `doc` to the builder containing the intended store paths of each
    output. The builder would typically do something like

        ./configure --libdir=$lib/lib --includedir=$headers/include --docdir=$doc/share/doc

    for an Autoconf-style package. You can refer to each output of a
    derivation by selecting it as an attribute, e.g.

        buildInputs = [ pkg.lib pkg.headers ];

    The first element of `outputs` determines the *default output*.
    Thus, you could also write

        buildInputs = [ pkg pkg.headers ];

    since `pkg` is equivalent to `pkg.lib`.

The function `mkDerivation` in the Nixpkgs standard environment is a
wrapper around `derivation` that adds a default value for `system` and
always uses Bash as the builder, to which the supplied builder is passed
as a command-line argument. See the Nixpkgs manual for details.

The builder is executed as follows:

  - A temporary directory is created under the directory specified by
    `TMPDIR` (default `/tmp`) where the build will take place. The
    current directory is changed to this directory.

  - The environment is cleared and set to the derivation attributes, as
    specified above.

  - In addition, the following variables are set:

      - `NIX_BUILD_TOP` contains the path of the temporary directory for
        this build.

      - Also, `TMPDIR`, `TEMPDIR`, `TMP`, `TEMP` are set to point to the
        temporary directory. This is to prevent the builder from
        accidentally writing temporary files anywhere else. Doing so
        might cause interference by other processes.

      - `PATH` is set to `/path-not-set` to prevent shells from
        initialising it to their built-in default value.

      - `HOME` is set to `/homeless-shelter` to prevent programs from
        using `/etc/passwd` or the like to find the user's home
        directory, which could cause impurity. Usually, when `HOME` is
        set, it is used as the location of the home directory, even if
        it points to a non-existent path.

      - `NIX_STORE` is set to the path of the top-level Nix store
        directory (typically, `/nix/store`).

      - For each output declared in `outputs`, the corresponding
        environment variable is set to point to the intended path in the
        Nix store for that output. Each output path is a concatenation
        of the cryptographic hash of all build inputs, the `name`
        attribute and the output name. (The output name is omitted if
        it’s `out`.)

  - If an output path already exists, it is removed. Also, locks are
    acquired to prevent multiple Nix instances from performing the same
    build at the same time.

  - A log of the combined standard output and error is written to
    `/nix/var/log/nix`.

  - The builder is executed with the arguments specified by the
    attribute `args`. If it exits with exit code 0, it is considered to
    have succeeded.

  - The temporary directory is removed (unless the `-K` option was
    specified).

  - If the build was successful, Nix scans each output path for
    references to input paths by looking for the hash parts of the input
    paths. Since these are potential runtime dependencies, Nix registers
    them as dependencies of the output paths.

  - After the build, Nix sets the last-modified timestamp on all files
    in the build result to 1 (00:00:01 1/1/1970 UTC), sets the group to
    the default group, and sets the mode of the file to 0444 or 0555
    (i.e., read-only, with execute permission enabled if the file was
    originally executable). Note that possible `setuid` and `setgid`
    bits are cleared. Setuid and setgid programs are not currently
    supported by Nix. This is because the Nix archives used in
    deployment have no concept of ownership information, and because it
    makes the build result dependent on the user performing the build.

### Advanced Attributes

Derivations can declare some infrequently used optional attributes.

  - `allowedReferences`
    The optional attribute `allowedReferences` specifies a list of legal
    references (dependencies) of the output of the builder. For example,

        allowedReferences = [];

    enforces that the output of a derivation cannot have any runtime
    dependencies on its inputs. To allow an output to have a runtime
    dependency on itself, use `"out"` as a list item. This is used in
    NixOS to check that generated files such as initial ramdisks for
    booting Linux don’t have accidental dependencies on other paths in
    the Nix store.

  - `allowedRequisites`
    This attribute is similar to `allowedReferences`, but it specifies
    the legal requisites of the whole closure, so all the dependencies
    recursively. For example,

        allowedRequisites = [ foobar ];

    enforces that the output of a derivation cannot have any other
    runtime dependency than `foobar`, and in addition it enforces that
    `foobar` itself doesn't introduce any other dependency itself.

  - `disallowedReferences`
    The optional attribute `disallowedReferences` specifies a list of
    illegal references (dependencies) of the output of the builder. For
    example,

        disallowedReferences = [ foo ];

    enforces that the output of a derivation cannot have a direct
    runtime dependencies on the derivation `foo`.

  - `disallowedRequisites`
    This attribute is similar to `disallowedReferences`, but it
    specifies illegal requisites for the whole closure, so all the
    dependencies recursively. For example,

        disallowedRequisites = [ foobar ];

    enforces that the output of a derivation cannot have any runtime
    dependency on `foobar` or any other derivation depending recursively
    on `foobar`.

  - `exportReferencesGraph`
    This attribute allows builders access to the references graph of
    their inputs. The attribute is a list of inputs in the Nix store
    whose references graph the builder needs to know. The value of this
    attribute should be a list of pairs `[ name1
                    path1 name2
                    path2 ...
                    ]`. The references graph of each \<pathN\> will be stored in a text
    file \<nameN\> in the temporary build directory. The text files have
    the format used by `nix-store
                    --register-validity` (with the deriver fields left empty). For
    example, when the following derivation is built:

        derivation {
          ...
          exportReferencesGraph = [ "libfoo-graph" libfoo ];
        };

    the references graph of `libfoo` is placed in the file
    `libfoo-graph` in the temporary build directory.

    `exportReferencesGraph` is useful for builders that want to do
    something with the closure of a store path. Examples include the
    builders in NixOS that generate the initial ramdisk for booting
    Linux (a `cpio` archive containing the closure of the boot script)
    and the ISO-9660 image for the installation CD (which is populated
    with a Nix store containing the closure of a bootable NixOS
    configuration).

  - `impureEnvVars`
    This attribute allows you to specify a list of environment variables
    that should be passed from the environment of the calling user to
    the builder. Usually, the environment is cleared completely when the
    builder is executed, but with this attribute you can allow specific
    environment variables to be passed unmodified. For example,
    `fetchurl` in Nixpkgs has the line

        impureEnvVars = [ "http_proxy" "https_proxy" ... ];

    to make it use the proxy server configuration specified by the user
    in the environment variables `http_proxy` and friends.

    This attribute is only allowed in [fixed-output
    derivations](#fixed-output-drvs), where impurities such as these are
    okay since (the hash of) the output is known in advance. It is
    ignored for all other derivations.

    <div class="warning">

    `impureEnvVars` implementation takes environment variables from the
    current builder process. When a daemon is building its environmental
    variables are used. Without the daemon, the environmental variables
    come from the environment of the `nix-build`.

    </div>

  - `outputHash`; `outputHashAlgo`; `outputHashMode`
    These attributes declare that the derivation is a so-called
    *fixed-output derivation*, which means that a cryptographic hash of
    the output is already known in advance. When the build of a
    fixed-output derivation finishes, Nix computes the cryptographic
    hash of the output and compares it to the hash declared with these
    attributes. If there is a mismatch, the build fails.

    The rationale for fixed-output derivations is derivations such as
    those produced by the `fetchurl` function. This function downloads a
    file from a given URL. To ensure that the downloaded file has not
    been modified, the caller must also specify a cryptographic hash of
    the file. For example,

        fetchurl {
          url = "http://ftp.gnu.org/pub/gnu/hello/hello-2.1.1.tar.gz";
          sha256 = "1md7jsfd8pa45z73bz1kszpp01yw6x5ljkjk2hx7wl800any6465";
        }

    It sometimes happens that the URL of the file changes, e.g., because
    servers are reorganised or no longer available. We then must update
    the call to `fetchurl`, e.g.,

        fetchurl {
          url = "ftp://ftp.nluug.nl/pub/gnu/hello/hello-2.1.1.tar.gz";
          sha256 = "1md7jsfd8pa45z73bz1kszpp01yw6x5ljkjk2hx7wl800any6465";
        }

    If a `fetchurl` derivation was treated like a normal derivation, the
    output paths of the derivation and *all derivations depending on it*
    would change. For instance, if we were to change the URL of the
    Glibc source distribution in Nixpkgs (a package on which almost all
    other packages depend) massive rebuilds would be needed. This is
    unfortunate for a change which we know cannot have a real effect as
    it propagates upwards through the dependency graph.

    For fixed-output derivations, on the other hand, the name of the
    output path only depends on the `outputHash*` and `name` attributes,
    while all other attributes are ignored for the purpose of computing
    the output path. (The `name` attribute is included because it is
    part of the path.)

    As an example, here is the (simplified) Nix expression for
    `fetchurl`:

        { stdenv, curl }: # The curl program is used for downloading.

        { url, sha256 }:

        stdenv.mkDerivation {
          name = baseNameOf (toString url);
          builder = ./builder.sh;
          buildInputs = [ curl ];

          # This is a fixed-output derivation; the output must be a regular
          # file with SHA256 hash sha256.
          outputHashMode = "flat";
          outputHashAlgo = "sha256";
          outputHash = sha256;

          inherit url;
        }

    The `outputHashAlgo` attribute specifies the hash algorithm used to
    compute the hash. It can currently be `"sha1"`, `"sha256"` or
    `"sha512"`.

    The `outputHashMode` attribute determines how the hash is computed.
    It must be one of the following two values:

      - `"flat"`
        The output must be a non-executable regular file. If it isn’t,
        the build fails. The hash is simply computed over the contents
        of that file (so it’s equal to what Unix commands like
        `sha256sum` or `sha1sum` produce).

        This is the default.

      - `"recursive"`
        The hash is computed over the NAR archive dump of the output
        (i.e., the result of [`nix-store
                                                                        --dump`](#refsec-nix-store-dump)). In this case, the output can
        be anything, including a directory tree.

    The `outputHash` attribute, finally, must be a string containing the
    hash in either hexadecimal or base-32 notation. (See the [`nix-hash`
    command](#sec-nix-hash) for information about converting to and from
    base-32 notation.)

  - `passAsFile`
    A list of names of attributes that should be passed via files rather
    than environment variables. For example, if you have

    ```
    passAsFile = ["big"];
    big = "a very long string";

    ```

    then when the builder runs, the environment variable `bigPath` will
    contain the absolute path to a temporary file containing `a very
    long
                    string`. That is, for any attribute \<x\> listed in `passAsFile`,
    Nix will pass an environment variable `xPath` holding the path of
    the file containing the value of attribute \<x\>. This is useful
    when you need to pass large strings to a builder, since most
    operating systems impose a limit on the size of the environment
    (typically, a few hundred kilobyte).

  - `preferLocalBuild`
    If this attribute is set to `true` and [distributed building is
    enabled](#chap-distributed-builds), then, if possible, the derivaton
    will be built locally instead of forwarded to a remote machine. This
    is appropriate for trivial builders where the cost of doing a
    download or remote build would exceed the cost of building locally.

  - `allowSubstitutes`
    If this attribute is set to `false`, then Nix will always build this
    derivation; it will not try to substitute its outputs. This is
    useful for very trivial derivations (such as `writeText` in Nixpkgs)
    that are cheaper to build than to substitute from a binary cache.

    <div class="note">

    You need to have a builder configured which satisfies the
    derivation’s `system` attribute, since the derivation cannot be
    substituted. Thus it is usually a good idea to align `system` with
    `builtins.currentSystem` when setting `allowSubstitutes` to `false`.
    For most trivial derivations this should be the case.

    </div>

## Built-in Functions

This section lists the functions and constants built into the Nix
expression evaluator. (The built-in function `derivation` is discussed
above.) Some built-ins, such as `derivation`, are always in scope of
every Nix expression; you can just access them right away. But to
prevent polluting the namespace too much, most built-ins are not in
scope. Instead, you can access them through the `builtins` built-in
value, which is a set that contains all built-in functions and values.
For instance, `derivation` is also available as `builtins.derivation`.

  - `abort` \<s\>; `builtins.abort` \<s\>
    Abort Nix expression evaluation, print error message \<s\>.

  - `builtins.add` \<e1\> \<e2\>
    Return the sum of the numbers \<e1\> and \<e2\>.

  - `builtins.all` \<pred\> \<list\>
    Return `true` if the function \<pred\> returns `true` for all
    elements of \<list\>, and `false` otherwise.

  - `builtins.any` \<pred\> \<list\>
    Return `true` if the function \<pred\> returns `true` for at least
    one element of \<list\>, and `false` otherwise.

  - `builtins.attrNames` \<set\>
    Return the names of the attributes in the set \<set\> in an
    alphabetically sorted list. For instance, `builtins.attrNames { y
    = 1; x = "foo"; }` evaluates to `[ "x" "y" ]`.

  - `builtins.attrValues` \<set\>
    Return the values of the attributes in the set \<set\> in the order
    corresponding to the sorted attribute names.

  - `baseNameOf` \<s\>
    Return the *base name* of the string \<s\>, that is, everything
    following the final slash in the string. This is similar to the GNU
    `basename` command.

  - `builtins.bitAnd` \<e1\> \<e2\>
    Return the bitwise AND of the integers \<e1\> and \<e2\>.

  - `builtins.bitOr` \<e1\> \<e2\>
    Return the bitwise OR of the integers \<e1\> and \<e2\>.

  - `builtins.bitXor` \<e1\> \<e2\>
    Return the bitwise XOR of the integers \<e1\> and \<e2\>.

  - `builtins`
    The set `builtins` contains all the built-in functions and values.
    You can use `builtins` to test for the availability of features in
    the Nix installation, e.g.,

        if builtins ? getEnv then builtins.getEnv "PATH" else ""

    This allows a Nix expression to fall back gracefully on older Nix
    installations that don’t have the desired built-in function.

  - `builtins.compareVersions` \<s1\> \<s2\>
    Compare two strings representing versions and return `-1` if version
    \<s1\> is older than version \<s2\>, `0` if they are the same, and
    `1` if \<s1\> is newer than \<s2\>. The version comparison algorithm
    is the same as the one used by [`nix-env
                    -u`](#ssec-version-comparisons).

  - `builtins.concatLists` \<lists\>
    Concatenate a list of lists into a single list.

  - `builtins.concatStringsSep` \<separator\> \<list\>
    Concatenate a list of strings with a separator between each element,
    e.g. `concatStringsSep "/"
                    ["usr" "local" "bin"] == "usr/local/bin"`

  - `builtins.currentSystem`
    The built-in value `currentSystem` evaluates to the Nix platform
    identifier for the Nix installation on which the expression is being
    evaluated, such as `"i686-linux"` or `"x86_64-darwin"`.

  - `builtins.deepSeq` \<e1\> \<e2\>
    This is like `seq
                    e1
                    e2`, except that \<e1\> is evaluated *deeply*: if it’s a list or
    set, its elements or attributes are also evaluated recursively.

  - `derivation` \<attrs\>; `builtins.derivation` \<attrs\>
    `derivation` is described in [Derivations](#ssec-derivation).

  - `dirOf` \<s\>; `builtins.dirOf` \<s\>
    Return the directory part of the string \<s\>, that is, everything
    before the final slash in the string. This is similar to the GNU
    `dirname` command.

  - `builtins.div` \<e1\> \<e2\>
    Return the quotient of the numbers \<e1\> and \<e2\>.

  - `builtins.elem` \<x\> \<xs\>
    Return `true` if a value equal to \<x\> occurs in the list \<xs\>,
    and `false` otherwise.

  - `builtins.elemAt` \<xs\> \<n\>
    Return element \<n\> from the list \<xs\>. Elements are counted
    starting from 0. A fatal error occurs if the index is out of bounds.

  - `builtins.fetchurl` \<url\>
    Download the specified URL and return the path of the downloaded
    file. This function is not available if [restricted evaluation
    mode](#conf-restrict-eval) is enabled.

  - `fetchTarball` \<url\>; `builtins.fetchTarball` \<url\>
    Download the specified URL, unpack it and return the path of the
    unpacked tree. The file must be a tape archive (`.tar`) compressed
    with `gzip`, `bzip2` or `xz`. The top-level path component of the
    files in the tarball is removed, so it is best if the tarball
    contains a single directory at top level. The typical use of the
    function is to obtain external Nix expression dependencies, such as
    a particular version of Nixpkgs, e.g.

        with import (fetchTarball https://github.com/NixOS/nixpkgs/archive/nixos-14.12.tar.gz) {};

        stdenv.mkDerivation { … }

    The fetched tarball is cached for a certain amount of time (1 hour
    by default) in `~/.cache/nix/tarballs/`. You can change the cache
    timeout either on the command line with `--option tarball-ttl number
    of seconds` or in the Nix configuration file with this option: `
    number of seconds to cache `.

    Note that when obtaining the hash with ` nix-prefetch-url
                     ` the option `--unpack` is required.

    This function can also verify the contents against a hash. In that
    case, the function takes a set instead of a URL. The set requires
    the attribute `url` and the attribute `sha256`, e.g.

        with import (fetchTarball {
          url = "https://github.com/NixOS/nixpkgs/archive/nixos-14.12.tar.gz";
          sha256 = "1jppksrfvbk5ypiqdz4cddxdl8z6zyzdb2srq8fcffr327ld5jj2";
        }) {};

        stdenv.mkDerivation { … }

    This function is not available if [restricted evaluation
    mode](#conf-restrict-eval) is enabled.

  - `builtins.fetchGit` \<args\>
    Fetch a path from git. \<args\> can be a URL, in which case the HEAD
    of the repo at that URL is fetched. Otherwise, it can be an
    attribute with the following attributes (all except `url` optional):

      - url
        The URL of the repo.

      - name
        The name of the directory the repo should be exported to in the
        store. Defaults to the basename of the URL.

      - rev
        The git revision to fetch. Defaults to the tip of `ref`.

      - ref
        The git ref to look for the requested revision under. This is
        often a branch or tag name. Defaults to `HEAD`.

        By default, the `ref` value is prefixed with `refs/heads/`. As
        of Nix 2.3.0 Nix will not prefix `refs/heads/` if `ref` starts
        with `refs/`.

      - submodules
        A Boolean parameter that specifies whether submodules should be
        checked out. Defaults to `false`.

    <!-- end list -->

        builtins.fetchGit {
          url = "git@github.com:my-secret/repository.git";
          ref = "master";
          rev = "adab8b916a45068c044658c4158d81878f9ed1c3";
        }

        builtins.fetchGit {
          url = "https://github.com/NixOS/nix.git";
          ref = "refs/heads/0.5-release";
        }

    If the revision you're looking for is in the default branch of the
    git repository you don't strictly need to specify the branch name in
    the `ref` attribute.

    However, if the revision you're looking for is in a future branch
    for the non-default branch you will need to specify the the `ref`
    attribute as well.

        builtins.fetchGit {
          url = "https://github.com/nixos/nix.git";
          rev = "841fcbd04755c7a2865c51c1e2d3b045976b7452";
          ref = "1.11-maintenance";
        }

    <div class="note">

    It is nice to always specify the branch which a revision belongs to.
    Without the branch being specified, the fetcher might fail if the
    default branch changes. Additionally, it can be confusing to try a
    commit from a non-default branch and see the fetch fail. If the
    branch is specified the fault is much more obvious.

    </div>

    If the revision you're looking for is in the default branch of the
    git repository you may omit the `ref` attribute.

        builtins.fetchGit {
          url = "https://github.com/nixos/nix.git";
          rev = "841fcbd04755c7a2865c51c1e2d3b045976b7452";
        }

        builtins.fetchGit {
          url = "https://github.com/nixos/nix.git";
          ref = "refs/tags/1.9";
        }

    `builtins.fetchGit` can behave impurely fetch the latest version of
    a remote branch.

    <div class="note">

    Nix will refetch the branch in accordance to
    [varlistentry\_title](#conf-tarball-ttl).

    </div>

    <div class="note">

    This behavior is disabled in *Pure evaluation mode*.

    </div>

        builtins.fetchGit {
          url = "ssh://git@github.com/nixos/nix.git";
          ref = "master";
        }

  - `builtins.filter` \<f\> \<xs\>
    Return a list consisting of the elements of \<xs\> for which the
    function \<f\> returns `true`.

  - `builtins.filterSource` \<e1\> \<e2\>
    This function allows you to copy sources into the Nix store while
    filtering certain files. For instance, suppose that you want to use
    the directory `source-dir` as an input to a Nix expression, e.g.

        stdenv.mkDerivation {
          ...
          src = ./source-dir;
        }

    However, if `source-dir` is a Subversion working copy, then all
    those annoying `.svn` subdirectories will also be copied to the
    store. Worse, the contents of those directories may change a lot,
    causing lots of spurious rebuilds. With `filterSource` you can
    filter out the `.svn` directories:

    ```
      src = builtins.filterSource
        (path: type: type != "directory" || baseNameOf path != ".svn")
        ./source-dir;
    ```

    Thus, the first argument \<e1\> must be a predicate function that is
    called for each regular file, directory or symlink in the source
    tree \<e2\>. If the function returns `true`, the file is copied to
    the Nix store, otherwise it is omitted. The function is called with
    two arguments. The first is the full path of the file. The second is
    a string that identifies the type of the file, which is either
    `"regular"`, `"directory"`, `"symlink"` or `"unknown"` (for other
    kinds of files such as device nodes or fifos — but note that those
    cannot be copied to the Nix store, so if the predicate returns
    `true` for them, the copy will fail). If you exclude a directory,
    the entire corresponding subtree of \<e2\> will be excluded.

  - `builtins.foldl’` \<op\> \<nul\> \<list\>
    Reduce a list by applying a binary operator, from left to right,
    e.g. `foldl’ op nul [x0 x1 x2 ...] = op (op
                    (op nul x0) x1) x2) ...`. The operator is applied strictly, i.e.,
    its arguments are evaluated first. For example, `foldl’ (x: y: x +
    y) 0 [1 2 3]` evaluates to 6.

  - `builtins.functionArgs` \<f\>
    Return a set containing the names of the formal arguments expected
    by the function \<f\>. The value of each attribute is a Boolean
    denoting whether the corresponding argument has a default value. For
    instance, `functionArgs ({ x, y ? 123}: ...) = { x = false; y =
    true; }`.

    "Formal argument" here refers to the attributes pattern-matched by
    the function. Plain lambdas are not included, e.g. `functionArgs (x:
    ...) = { }`.

  - `builtins.fromJSON` \<e\>
    Convert a JSON string to a Nix value. For example,

        builtins.fromJSON ''{"x": [1, 2, 3], "y": null}''

    returns the value `{ x = [ 1 2 3 ]; y = null;
                    }`.

  - `builtins.genList` \<generator\> \<length\>
    Generate list of size \<length\>, with each element \<i\> equal to
    the value returned by \<generator\> `i`. For example,

        builtins.genList (x: x * x) 5

    returns the list `[ 0 1 4 9 16 ]`.

  - `builtins.getAttr` \<s\> \<set\>
    `getAttr` returns the attribute named \<s\> from \<set\>. Evaluation
    aborts if the attribute doesn’t exist. This is a dynamic version of
    the `.` operator, since \<s\> is an expression rather than an
    identifier.

  - `builtins.getEnv` \<s\>
    `getEnv` returns the value of the environment variable \<s\>, or an
    empty string if the variable doesn’t exist. This function should be
    used with care, as it can introduce all sorts of nasty environment
    dependencies in your Nix expression.

    `getEnv` is used in Nix Packages to locate the file
    `~/.nixpkgs/config.nix`, which contains user-local settings for Nix
    Packages. (That is, it does a `getEnv "HOME"` to locate the user’s
    home directory.)

  - `builtins.hasAttr` \<s\> \<set\>
    `hasAttr` returns `true` if \<set\> has an attribute named \<s\>,
    and `false` otherwise. This is a dynamic version of the `?`
    operator, since \<s\> is an expression rather than an identifier.

  - `builtins.hashString` \<type\> \<s\>
    Return a base-16 representation of the cryptographic hash of string
    \<s\>. The hash algorithm specified by \<type\> must be one of
    `"md5"`, `"sha1"`, `"sha256"` or `"sha512"`.

  - `builtins.hashFile` \<type\> \<p\>
    Return a base-16 representation of the cryptographic hash of the
    file at path \<p\>. The hash algorithm specified by \<type\> must be
    one of `"md5"`, `"sha1"`, `"sha256"` or `"sha512"`.

  - `builtins.head` \<list\>
    Return the first element of a list; abort evaluation if the argument
    isn’t a list or is an empty list. You can test whether a list is
    empty by comparing it with `[]`.

  - `import` \<path\>; `builtins.import` \<path\>
    Load, parse and return the Nix expression in the file \<path\>. If
    \<path\> is a directory, the file ` default.nix
                     ` in that directory is loaded. Evaluation aborts if the file
    doesn’t exist or contains an incorrect Nix expression. `import`
    implements Nix’s module system: you can put any Nix expression (such
    as a set or a function) in a separate file, and use it from Nix
    expressions in other files.

    <div class="note">

    Unlike some languages, `import` is a regular function in Nix. Paths
    using the angle bracket syntax (e.g., `
                    import` \<\<foo\>\>) are normal path values (see
    [Values](#ssec-values)).

    </div>

    A Nix expression loaded by `import` must not contain any *free
    variables* (identifiers that are not defined in the Nix expression
    itself and are not built-in). Therefore, it cannot refer to
    variables that are in scope at the call site. For instance, if you
    have a calling expression

        rec {
          x = 123;
          y = import ./foo.nix;
        }

    then the following `foo.nix` will give an error:

        x + 456

    since `x` is not in scope in `foo.nix`. If you want `x` to be
    available in `foo.nix`, you should pass it as a function argument:

        rec {
          x = 123;
          y = import ./foo.nix x;
        }

    and

        x: x + 456

    (The function argument doesn’t have to be called `x` in `foo.nix`;
    any name would work.)

  - `builtins.intersectAttrs` \<e1\> \<e2\>
    Return a set consisting of the attributes in the set \<e2\> that
    also exist in the set \<e1\>.

  - `builtins.isAttrs` \<e\>
    Return `true` if \<e\> evaluates to a set, and `false` otherwise.

  - `builtins.isList` \<e\>
    Return `true` if \<e\> evaluates to a list, and `false` otherwise.

  - `builtins.isFunction` \<e\>
    Return `true` if \<e\> evaluates to a function, and `false`
    otherwise.

  - `builtins.isString` \<e\>
    Return `true` if \<e\> evaluates to a string, and `false` otherwise.

  - `builtins.isInt` \<e\>
    Return `true` if \<e\> evaluates to an int, and `false` otherwise.

  - `builtins.isFloat` \<e\>
    Return `true` if \<e\> evaluates to a float, and `false` otherwise.

  - `builtins.isBool` \<e\>
    Return `true` if \<e\> evaluates to a bool, and `false` otherwise.

  - `builtins.isPath` \<e\>
    Return `true` if \<e\> evaluates to a path, and `false` otherwise.

  - `isNull` \<e\>; `builtins.isNull` \<e\>
    Return `true` if \<e\> evaluates to `null`, and `false` otherwise.

    <div class="warning">

    This function is *deprecated*; just write `e == null` instead.

    </div>

  - `builtins.length` \<e\>
    Return the length of the list \<e\>.

  - `builtins.lessThan` \<e1\> \<e2\>
    Return `true` if the number \<e1\> is less than the number \<e2\>,
    and `false` otherwise. Evaluation aborts if either \<e1\> or \<e2\>
    does not evaluate to a number.

  - `builtins.listToAttrs` \<e\>
    Construct a set from a list specifying the names and values of each
    attribute. Each element of the list should be a set consisting of a
    string-valued attribute `name` specifying the name of the attribute,
    and an attribute `value` specifying its value. Example:

        builtins.listToAttrs
          [ { name = "foo"; value = 123; }
            { name = "bar"; value = 456; }
          ]

    evaluates to

        { foo = 123; bar = 456; }

  - `map` \<f\> \<list\>; `builtins.map` \<f\> \<list\>
    Apply the function \<f\> to each element in the list \<list\>. For
    example,

        map (x: "foo" + x) [ "bar" "bla" "abc" ]

    evaluates to `[ "foobar" "foobla" "fooabc"
                    ]`.

  - `builtins.match` \<regex\> \<str\>
    Returns a list if the [extended POSIX regular
    expression](http://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap09.html#tag_09_04)
    \<regex\> matches \<str\> precisely, otherwise returns `null`. Each
    item in the list is a regex group.

        builtins.match "ab" "abc"

    Evaluates to `null`.

        builtins.match "abc" "abc"

    Evaluates to `[ ]`.

        builtins.match "a(b)(c)" "abc"

    Evaluates to `[ "b" "c" ]`.

        builtins.match "[[:space:]]+([[:upper:]]+)[[:space:]]+" "  FOO   "

    Evaluates to `[ "foo" ]`.

  - `builtins.mul` \<e1\> \<e2\>
    Return the product of the numbers \<e1\> and \<e2\>.

  - `builtins.parseDrvName` \<s\>
    Split the string \<s\> into a package name and version. The package
    name is everything up to but not including the first dash followed
    by a digit, and the version is everything following that dash. The
    result is returned in a set `{ name, version }`. Thus,
    `builtins.parseDrvName "nix-0.12pre12876"` returns `{ name = "nix";
    version = "0.12pre12876";
                    }`.

  - `builtins.path` \<args\>
    An enrichment of the built-in path type, based on the attributes
    present in \<args\>. All are optional except `path`:

      - path
        The underlying path.

      - name
        The name of the path when added to the store. This can used to
        reference paths that have nix-illegal characters in their names,
        like `@`.

      - filter
        A function of the type expected by
        [builtins.filterSource](#builtin-filterSource), with the same
        semantics.

      - recursive
        When `false`, when `path` is added to the store it is with a
        flat hash, rather than a hash of the NAR serialization of the
        file. Thus, `path` must refer to a regular file, not a
        directory. This allows similar behavior to `fetchurl`. Defaults
        to `true`.

      - sha256
        When provided, this is the expected hash of the file at the
        path. Evaluation will fail if the hash is incorrect, and
        providing a hash allows `builtins.path` to be used even when the
        `pure-eval` nix config option is on.

  - `builtins.pathExists` \<path\>
    Return `true` if the path \<path\> exists at evaluation time, and
    `false` otherwise.

  - `builtins.placeholder` \<output\>
    Return a placeholder string for the specified \<output\> that will
    be substituted by the corresponding output path at build time.
    Typical outputs would be `"out"`, `"bin"` or `"dev"`.

  - `builtins.readDir` \<path\>
    Return the contents of the directory \<path\> as a set mapping
    directory entries to the corresponding file type. For instance, if
    directory `A` contains a regular file `B` and another directory `C`,
    then `builtins.readDir
                    ./A` will return the set

        { B = "regular"; C = "directory"; }

    The possible values for the file type are `"regular"`,
    `"directory"`, `"symlink"` and `"unknown"`.

  - `builtins.readFile` \<path\>
    Return the contents of the file \<path\> as a string.

  - `removeAttrs` \<set\> \<list\>; `builtins.removeAttrs` \<set\>
    \<list\>
    Remove the attributes listed in \<list\> from \<set\>. The
    attributes don’t have to exist in \<set\>. For instance,

        removeAttrs { x = 1; y = 2; z = 3; } [ "a" "x" "z" ]

    evaluates to `{ y = 2; }`.

  - `builtins.replaceStrings` \<from\> \<to\> \<s\>
    Given string \<s\>, replace every occurrence of the strings in
    \<from\> with the corresponding string in \<to\>. For example,

        builtins.replaceStrings ["oo" "a"] ["a" "i"] "foobar"

    evaluates to `"fabir"`.

  - `builtins.seq` \<e1\> \<e2\>
    Evaluate \<e1\>, then evaluate and return \<e2\>. This ensures that
    a computation is strict in the value of \<e1\>.

  - `builtins.sort` \<comparator\> \<list\>
    Return \<list\> in sorted order. It repeatedly calls the function
    \<comparator\> with two elements. The comparator should return
    `true` if the first element is less than the second, and `false`
    otherwise. For example,

        builtins.sort builtins.lessThan [ 483 249 526 147 42 77 ]

    produces the list `[ 42 77 147 249 483 526
                    ]`.

    This is a stable sort: it preserves the relative order of elements
    deemed equal by the comparator.

  - `builtins.split` \<regex\> \<str\>
    Returns a list composed of non matched strings interleaved with the
    lists of the [extended POSIX regular
    expression](http://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap09.html#tag_09_04)
    \<regex\> matches of \<str\>. Each item in the lists of matched
    sequences is a regex group.

        builtins.split "(a)b" "abc"

    Evaluates to `[ "" [ "a" ] "c" ]`.

        builtins.split "([ac])" "abc"

    Evaluates to `[ "" [ "a" ] "b" [ "c" ] "" ]`.

        builtins.split "(a)|(c)" "abc"

    Evaluates to `[ "" [ "a" null ] "b" [ null "c" ] "" ]`.

        builtins.split "([[:upper:]]+)" "  FOO   "

    Evaluates to `[ " " [ "FOO" ] " " ]`.

  - `builtins.splitVersion` \<s\>
    Split a string representing a version into its components, by the
    same version splitting logic underlying the version comparison in
    [`nix-env -u`](#ssec-version-comparisons).

  - `builtins.stringLength` \<e\>
    Return the length of the string \<e\>. If \<e\> is not a string,
    evaluation is aborted.

  - `builtins.sub` \<e1\> \<e2\>
    Return the difference between the numbers \<e1\> and \<e2\>.

  - `builtins.substring` \<start\> \<len\> \<s\>
    Return the substring of \<s\> from character position \<start\>
    (zero-based) up to but not including \<start + len\>. If \<start\>
    is greater than the length of the string, an empty string is
    returned, and if \<start + len\> lies beyond the end of the string,
    only the substring up to the end of the string is returned.
    \<start\> must be non-negative. For example,

        builtins.substring 0 3 "nixos"

    evaluates to `"nix"`.

  - `builtins.tail` \<list\>
    Return the second to last elements of a list; abort evaluation if
    the argument isn’t a list or is an empty list.

  - `throw` \<s\>; `builtins.throw` \<s\>
    Throw an error message \<s\>. This usually aborts Nix expression
    evaluation, but in `nix-env -qa` and other commands that try to
    evaluate a set of derivations to get information about those
    derivations, a derivation that throws an error is silently skipped
    (which is not the case for `abort`).

  - `builtins.toFile` \<name\> \<s\>
    Store the string \<s\> in a file in the Nix store and return its
    path. The file has suffix \<name\>. This file can be used as an
    input to derivations. One application is to write builders “inline”.
    For instance, the following Nix expression combines
    [example\_title](#ex-hello-nix) and
    [example\_title](#ex-hello-builder) into one file:

        { stdenv, fetchurl, perl }:

        stdenv.mkDerivation {
          name = "hello-2.1.1";

          builder = builtins.toFile "builder.sh" "
            source $stdenv/setup

            PATH=$perl/bin:$PATH

            tar xvfz $src
            cd hello-*
            ./configure --prefix=$out
            make
            make install
          ";

          src = fetchurl {
            url = "http://ftp.nluug.nl/pub/gnu/hello/hello-2.1.1.tar.gz";
            sha256 = "1md7jsfd8pa45z73bz1kszpp01yw6x5ljkjk2hx7wl800any6465";
          };
          inherit perl;
        }

    It is even possible for one file to refer to another, e.g.,

    ```
      builder = let
        configFile = builtins.toFile "foo.conf" "
          # This is some dummy configuration file.
          ...
        ";
      in builtins.toFile "builder.sh" "
        source $stdenv/setup
        ...
        cp ${configFile} $out/etc/foo.conf
      ";
    ```

    Note that `${configFile}` is an antiquotation (see
    [Values](#ssec-values)), so the result of the expression
    `configFile` (i.e., a path like
    `/nix/store/m7p7jfny445k...-foo.conf`) will be spliced into the
    resulting string.

    It is however *not* allowed to have files mutually referring to each
    other, like so:

        let
          foo = builtins.toFile "foo" "...${bar}...";
          bar = builtins.toFile "bar" "...${foo}...";
        in foo

    This is not allowed because it would cause a cyclic dependency in
    the computation of the cryptographic hashes for `foo` and `bar`.

    It is also not possible to reference the result of a derivation. If
    you are using Nixpkgs, the `writeTextFile` function is able to do
    that.

  - `builtins.toJSON` \<e\>
    Return a string containing a JSON representation of \<e\>. Strings,
    integers, floats, booleans, nulls and lists are mapped to their JSON
    equivalents. Sets (except derivations) are represented as objects.
    Derivations are translated to a JSON string containing the
    derivation’s output path. Paths are copied to the store and
    represented as a JSON string of the resulting store path.

  - `builtins.toPath` \<s\>
    DEPRECATED. Use `/. + "/path"` to convert a string into an absolute
    path. For relative paths, use `./. + "/path"`.

  - `toString` \<e\>; `builtins.toString` \<e\>
    Convert the expression \<e\> to a string. \<e\> can be:

      - A string (in which case the string is returned unmodified).

      - A path (e.g., `toString /foo/bar` yields `"/foo/bar"`.

      - A set containing `{ __toString = self: ...; }`.

      - An integer.

      - A list, in which case the string representations of its elements
        are joined with spaces.

      - A Boolean (`false` yields `""`, `true` yields `"1"`).

      - `null`, which yields the empty string.

  - `builtins.toXML` \<e\>
    Return a string containing an XML representation of \<e\>. The main
    application for `toXML` is to communicate information with the
    builder in a more structured format than plain environment
    variables.

    [example\_title](#ex-toxml) shows an example where this is the case.
    The builder is supposed to generate the configuration file for a
    [Jetty servlet container](http://jetty.mortbay.org/). A servlet
    container contains a number of servlets (`*.war` files) each
    exported under a specific URI prefix. So the servlet configuration
    is a list of sets containing the `path` and `war` of the servlet
    ([co\_title](#ex-toxml-co-servlets)). This kind of information is
    difficult to communicate with the normal method of passing
    information through an environment variable, which just concatenates
    everything together into a string (which might just work in this
    case, but wouldn’t work if fields are optional or contain lists
    themselves). Instead the Nix expression is converted to an XML
    representation with `toXML`, which is unambiguous and can easily be
    processed with the appropriate tools. For instance, in the example
    an XSLT stylesheet ([co\_title](#ex-toxml-co-stylesheet)) is applied
    to it ([co\_title](#ex-toxml-co-apply)) to generate the XML
    configuration file for the Jetty server. The XML representation
    produced from [co\_title](#ex-toxml-co-servlets) by `toXML` is shown
    in [example\_title](#ex-toxml-result).

    Note that [example\_title](#ex-toxml) uses the `toFile` built-in to
    write the builder and the stylesheet “inline” in the Nix expression.
    The path of the stylesheet is spliced into the builder at `xsltproc
    ${stylesheet}
                    ...`.

        { stdenv, fetchurl, libxslt, jira, uberwiki }:

        stdenv.mkDerivation (rec {
          name = "web-server";

          buildInputs = [ libxslt ];

          builder = builtins.toFile "builder.sh" "
            source $stdenv/setup
            mkdir $out
            echo "$servlets" | xsltproc ${stylesheet} - > $out/server-conf.xml
          ";

          stylesheet = builtins.toFile "stylesheet.xsl"
           "<?xml version='1.0' encoding='UTF-8'?>
            <xsl:stylesheet xmlns:xsl='http://www.w3.org/1999/XSL/Transform' version='1.0'>
              <xsl:template match='/'>
                <Configure>
                  <xsl:for-each select='/expr/list/attrs'>
                    <Call name='addWebApplication'>
                      <Arg><xsl:value-of select=\"attr[@name = 'path']/string/@value\" /></Arg>
                      <Arg><xsl:value-of select=\"attr[@name = 'war']/path/@value\" /></Arg>
                    </Call>
                  </xsl:for-each>
                </Configure>
              </xsl:template>
            </xsl:stylesheet>
          ";

          servlets = builtins.toXML [
            { path = "/bugtracker"; war = jira + "/lib/atlassian-jira.war"; }
            { path = "/wiki"; war = uberwiki + "/uberwiki.war"; }
          ];
        })

        <?xml version='1.0' encoding='utf-8'?>
        <expr>
          <list>
            <attrs>
              <attr name="path">
                <string value="/bugtracker" />
              </attr>
              <attr name="war">
                <path value="/nix/store/d1jh9pasa7k2...-jira/lib/atlassian-jira.war" />
              </attr>
            </attrs>
            <attrs>
              <attr name="path">
                <string value="/wiki" />
              </attr>
              <attr name="war">
                <path value="/nix/store/y6423b1yi4sx...-uberwiki/uberwiki.war" />
              </attr>
            </attrs>
          </list>
        </expr>

  - `builtins.trace` \<e1\> \<e2\>
    Evaluate \<e1\> and print its abstract syntax representation on
    standard error. Then return \<e2\>. This function is useful for
    debugging.

  - `builtins.tryEval` \<e\>
    Try to shallowly evaluate \<e\>. Return a set containing the
    attributes `success` (`true` if \<e\> evaluated successfully,
    `false` if an error was thrown) and `value`, equalling \<e\> if
    successful and `false` otherwise. Note that this doesn't evaluate
    \<e\> deeply, so ` let e = { x = throw ""; }; in (builtins.tryEval
    e).success
                     ` will be `true`. Using ` builtins.deepSeq
                     ` one can get the expected result: `let e = { x = throw "";
                    }; in (builtins.tryEval (builtins.deepSeq e e)).success` will be
    `false`.

  - `builtins.typeOf` \<e\>
    Return a string representing the type of the value \<e\>, namely
    `"int"`, `"bool"`, `"string"`, `"path"`, `"null"`, `"set"`,
    `"list"`, `"lambda"` or `"float"`.
