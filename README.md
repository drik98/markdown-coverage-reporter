# Markdown Coverage Reporter

A custom coverage reporter for generating Markdown coverage reports. It is compatible with Vitest and implements the Istanbul.js reporter interface.

## Why Use This Reporter?

Typically, test coverage reports are generated and uploaded as artifacts in the CI environment of your source code management tool (e.g., GitLab CI). However, if you are running tests in a separate environment, such as Jenkins, there might be no straightforward way to report the coverage results back to your merge request.

This is where **Markdown Coverage Reporter** comes in. It creates an independent Markdown-formatted report that you can use anywhere—for example, as a comment in your merge request.

---

## Installation

To add the reporter to your project, install it as a development dependency:

```bash
npm install markdown-coverage-reporter --save-dev
```

## Usage

To use the reporter, add it to your test configuration (e.g., for Vitest or Istanbul):

```js
module.exports = {
  reporters: [
    'markdown-coverage-reporter'
  ]
};
```

### Configuration

You can customize the reporter by providing configuration options as an array, with the second entry being an object containing your desired settings.

Example configuration:

```js
module.exports = {
  reporters: [
    ['markdown-coverage-reporter', { file: './coverage/coverage-report.md' }]
  ]
};
```

Available configuration options are:

| Option    | Type    | Default       | Description                                                                 |
|-----------|---------|---------------|-----------------------------------------------------------------------------|
| `file`    | String  | `coverage.md` | The file path where the Markdown report will be written.                    |
| `maxCols` | Number  | `120`         | The maximum number of columns before wrapping lines in the Markdown report. |
| `color`   | Boolean | `true`        | Whether the values should be colored.                                       |
