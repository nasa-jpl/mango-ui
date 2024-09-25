# Developer

This document describes how to set up your development environment to build and develop mango-ui.

- [Prerequisite Software](#prerequisite-software)
- [Code Editor](#code-editor)
- [Getting the Sources](#getting-the-sources)
- [Installing NPM Modules](#installing-npm-modules)
- [Start Development Server](#start-development-server)
- [Building For Production](#building-for-production)
- [Cleaning](#cleaning)

## Prerequisite Software

Before you can run mango-ui you must install and configure the following products on your development machine:

- [Git](http://git-scm.com) and/or the [GitHub app](https://desktop.github.com/); [GitHub's Guide to Installing Git](https://help.github.com/articles/set-up-git) is a good source of information.

- [Node.js LTS](http://nodejs.org) which is used to run a development web server, and generate distributable files. We recommend using the [Node Version Manager (NVM)](https://github.com/nvm-sh/nvm) to install Node.js and [NPM](https://www.npmjs.com/) on your machine. Once you have NVM installed you can use the required Node.js/NPM versions via:

  ```shell
  cd mango-ui
  nvm use
  ```

## Code Editor

The recommended editor for developing mango-ui is [VS Code](https://code.visualstudio.com/) with the following settings and extensions. You can easily use another editor of your choice as long as you can replicate the code formatting settings.

### Settings.json

Your editor should follow the same settings found in [.vscode/settings.json](../.vscode/settings.json).

### Extensions

1. [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
2. [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
3. [Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint)
4. [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
5. [Vitest](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer)
6. [Path Intellisense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.path-intellisense)
7. [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)

## Getting the Sources

[Clone](https://help.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository) the mango-ui repository:

```shell
cd mango-ui
```

## Installing NPM Modules

Install the JavaScript modules needed to build mango-ui:

```shell
npm install
```

## Start Development Server

Run `npm run dev` for a dev server. Navigate to `http://localhost:5173/`. The app will automatically reload if you change any of the source files.

## Building For Production

Run `npm run build` to build a production version of the project. The build artifacts will be stored in the `build/` directory.
