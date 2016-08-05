An unofficial Code Climate engine for running sasstools/sass-lint.


### dev notes

You'll want to have the `codeclimate` command-line tool available. If you're on OS X you can probably:

```
$ brew tap codeclimate/formulae && brew install codeclimate
```

To build a Docker image so that the `codeclimate` command-line tool can read it:

```
# build image with specific tag
$ docker build --tag=codeclimate/codeclimate-sasslint .

# add a CC config file which uses the new linter
$ echo -e "engines:\n\tsasslint:\n\t\tenabled: true" > .codeclimate.yml

# run the new linter on the current directory
$ codeclimate analyze --dev
```
