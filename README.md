# fuzzaldrin-es

An ESM-compatible TypeScript rewrite of the `fuzzaldrin-plus` library.

## Warning

⚠️ **Use at your own risk** ⚠️

This library is an experimental rewrite of `fuzzaldrin-plus` and should not be considered a direct replacement. There are no guarantees that it functions identically to the original library. Use with caution in production environments.

## About

`fuzzaldrin-es` is an AI-assisted port of the `fuzzaldrin-plus` library to ESM-compatible TypeScript. It aims to provide similar functionality but in a more modern JavaScript ecosystem.

## Installation

```bash
npm install fuzzaldrin-es
```

## Usage

Please refer to the [fuzzaldrin-plus@0.6.0](https://www.npmjs.com/package/fuzzaldrin-plus/v/0.6.0) library documentation.

## Differences from fuzzaldrin-plus

This library is a rewrite of `fuzzaldrin-plus` in ESM-compatible TypeScript. While it aims to replicate the functionality of the original, there may be differences in behavior or performance due to the nature of the rewrite process. One potential advantage is improved bundling performance, as this library uses ESM instead of CommonJS. However, users should be aware that the differences in implementation could lead to varying results compared to the original `fuzzaldrin-plus`. **It's crucial to thoroughly test** this library against `fuzzaldrin-plus` in your specific use cases before adopting it in your projects.

## Contributing

Given the experimental nature of this library, contributions, especially in the form of test cases and behavioral comparisons with fuzzaldrin-plus, are welcome. Please open an issue or submit a pull request on GitHub.

## Acknowledgments

- Original fuzzaldrin-plus authors and contributors:
    - [atom/fuzzaldrin](https://github.com/atom/fuzzaldrin):
        ![atom/fuzzaldrin contributors](https://github.com/atom/fuzzaldrin/graphs/contributors)
    - [jeancroy/fuzz-aldrin-plus](https://github.com/jeancroy/fuzz-aldrin-plus)
        ![jeancroy/fuzz-aldrin-plus contributors](https://github.com/jeancroy/fuzz-aldrin-plus/graphs/contributors)
    - @aminya for the tests in [atom-community/zadeh](https://github.com/atom-community/zadeh)
- The chatbot AI used to assist in the rewrite process was Claude 3.5 Sonnet
