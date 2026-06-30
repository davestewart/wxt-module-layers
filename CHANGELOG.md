# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Demo

## [1.3.0] - 2026-06-30

### Added

- Layer `public/` file access (via `web_accessible_resources`) can now be controlled by module, source or layer `publicAccess` option (defaults to `<all_urls>`)
- Layer `public/` file paths are now registered with WXT so they appear in `.wxt/types/paths.d.ts` and resolve in TypeScript
- Module now auto-publishes to NPM thanks to GitHub Actions workflow

### Changed

- Background virtual module now keys handlers by layer name and supports `.main` exports, rather than relying on function names
- The layer-backgrounds virtual module plugin is now registered in both dev and build modes, so the `wxt-module-layers:background` import always resolves
- Clearer console messaging distinguishing manual (existing background) and auto (virtual entrypoint) modes

## [1.2.0] - 2025-12-19

### Changed

- Improve iteration and processing of sources, layers and options

## [1.1.1] - 2025-12-15

### Added

- ESLint configuration

## [1.1.0] - 2025-12-15

### Added

- Source options for configuring layer sources ([#10])

## [1.0.0] - 2025-12-09

### Added

- Core layer scanning and registration
- Support for all entrypoint types
- Manual entrypoints
- Auto-imports for components, composables, hooks and utils
- Asset aliases and public file copying
- Layer config merging
- Multiple background script handling via virtual module generation
- README documentation

[Unreleased]: https://github.com/davestewart/wxt-module-layers/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/davestewart/wxt-module-layers/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/davestewart/wxt-module-layers/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/davestewart/wxt-module-layers/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/davestewart/wxt-module-layers/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/davestewart/wxt-module-layers/releases/tag/v1.0.0
[#10]: https://github.com/davestewart/wxt-module-layers/pull/10
