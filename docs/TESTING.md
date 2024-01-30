# Testing

This document describes the testing development workflow. End-to-end tests are run using the [Playwright](https://playwright.dev/) testing library. Unit tests are run using the [Vitest](https://vitest.dev/) library.

## End-to-end

All end-to-end tests assume all GMAT services are running and available on `localhost`.

To execute end-to-end tests normally (i.e. not in debug mode), use the following command:

```sh
npm run test:e2e
```

### Troubleshooting

If this is your first time running the tests you may need to install the Playwright browser drivers:

```sh
npx playwright install
```

If something fails read the Playwright error carefully as it usually describes a quick fix. You can also look for the error in the [Playwright GitHub Issues](https://github.com/microsoft/playwright/issues) if you need more help.

### Debug

The debug test script runs the [Playwright inspector](https://playwright.dev/docs/inspector), which runs in headed debug mode so you can step through tests and watch them as they execute.

```sh
npm run test:e2e:debug
```

### Codegen

The codegen test script runs the [Playwright test generator](https://playwright.dev/docs/codegen), which automatically generates [locators](https://playwright.dev/docs/locators) as you click elements on the page. It can greatly save test development time. The generator requires an instance of the application already running to select against.

```sh
npm run preview          # Starts production build of gmat-ui
npm run test:e2e:codegen # Starts codegen
```

## Unit

To execute unit tests use the following command:

```sh
npm run test:unit
```
