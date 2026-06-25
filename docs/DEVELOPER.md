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

## Installing NPM Modules

Install the JavaScript modules needed to build mango-ui:

```shell
npm install
```

## Create certificates

Create a self-signed certificate for local development.

```
brew install mkcert
mkdir -p .cert && mkcert -key-file ./.cert/key.pem -cert-file ./.cert/cert.pem 'localhost'
```

## Environment variables

For a template of the environment variables required see `.env.template`. Create a `.env` file at the root of the project and populate it with the venue-specific values for the [DEV venue](https://github.jpl.nasa.gov/Mass-Change/mango-ops/blob/mass-change-viz/mango-ui/.env). Reach out to `mango-ui` repository owners for access to the configuration repository.

## Start Development Server

Run `npm run dev` for a dev server. Navigate to `https://localhost:5173/mango`. The app will automatically reload if you change any of the source files.

## Building For Production

Run `npm run build` to build a production version of the project. The build artifacts will be stored in the `build/` directory.

## Podman

To build the podman image, run:

`podman build -t mango-ui .`

To spin up a docker container on your local machine run this command and replace `RUNTIME_API_URL` with the API URL. Replace `RUNTIME_DOCS_URL` with the runtime url pointing to the deployed Mango Docs:

`podman run --name mango-ui -p 5174:5174 -v ./.cert:/app/.cert -e VITE_API_URL="{RUNTIME_API_URL}" -e VITE_MANGO_DOCS_URL="{RUNTIME_DOCS_URL}" mango-ui`
