# Common Configs

Start projects faster with preset configurations for commonly used libs/envs.

## Usage

```
node cc [-l] [-d] [-i] [-n] [<config-names>]
```

### Available Options

- `-l` (list): Lists available configs
- `-d` (dryrun): Prints the executables (without actually running them)
- `-i` (import): Imports available configs (accepts a space delimited list)
  - If a list is not passed, you'll initiate interactive mode
- `-n` (new): Adds a new config branch

Upon the _successful execution_ of `cc`, the requested config(s) will be imported into your project, followed by the removal of this project's repo, executable, and README — leaving only the config(s) you imported behind.

Regarding configs with `package.json` files:

- `package.json` files should _only_ have properties related to that config
  - Many of your `package.json`s will only need `scripts` and/or `dev/dependencies` objects
- To avoid file collisions, `package.json` files should have unique names following a `package.{unique-name}.json` pattern
  - Example: `package.eslint.json`
- Once `package.{unique-name}.json`s have been imported, `cc` will merge them into a single `package.json` and run `npm init` to complete the package creation.

## Dependencies

- Node
- Git

## Examples

### Load Configs

Import a TypeScript config

```
node cc -i typescript
```

Import TypeScript, ESLint, and Prettier configs

```
node cc -i typescript eslint prettier
```

Launch interactive mode

```
node cc -i
```

### Add New Config

Create a Vite config

```
node cc -n vite
```
