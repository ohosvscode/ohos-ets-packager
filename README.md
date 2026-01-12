# OpenHarmony ETS Toolchain Packager

This project automates the process of collecting, wrapping, and packaging the OpenHarmony ETS (ArkCompiler) toolchain binaries into a portable NPM package. It enables you to use tools like `es2abc` and `ark_js_vm` on your development machine with ease, similar to how TypeScript is used.

## Features

- **Automated Collection**: Scans OpenHarmony build output for required binaries and shared libraries.
- **Dependency Management**: Bundles necessary `.so` files (ICU, ZLib, Runtime) so you don't need to mess with system library paths.
- **Smart Wrappers**: Generates executable wrappers that automatically configure `LD_LIBRARY_PATH` before running the tools.
- **NPM Integration**: Generates a valid `package.json` for easy installation via `npm link` or `npm install`.

## Prerequisites

- **OpenHarmony Source Build**: You must have a successful build of OpenHarmony (specifically the `arkcompiler` components).
- **Node.js**: Required to run the build script.

## Configuration

The build is controlled by `config.json`. You may need to edit this file to match your environment:

```json
{
  "ohosRoot": "/path/to/your/openharmony/src",
  "outDirRelative": "out/rk3568/clang_x64",
  "frontend": "arkcompiler/ets_frontend",
  "runtime": "arkcompiler/ets_runtime",
  // ...
}
```

*   `ohosRoot`: Absolute path to your OpenHarmony source root.
*   `outDirRelative`: Path to the build output directory (relative to root).
*   `binaries`: List of executables to include in the package.

## How to Build

1.  Navigate to this directory.
2.  Run the build script:

    ```bash
    node build.js
    ```

    This will create a `dist/` directory containing the full package.

## How to Install & Use

### 1. Global Installation (Development)

To use the tools globally on your machine:

```bash
cd dist
npm link
```

### 2. Usage

Once linked, you can run the commands directly from any terminal:

```bash
# Compile JavaScript to Ark Bytecode
es2abc --output hello.abc hello.js

# Run the Bytecode
ark_js_vm hello.abc

# Check AOT Compiler
ark_aot_compiler --help
```

## Verify Build

A verification script is included to test that all binaries link correctly and function as expected:

```bash
bash verify.sh
```

## Included Tools

By default, the following tools are packaged:

*   **es2abc**: JS to ABC compiler
*   **ark_js_vm**: Ark Runtime Virtual Machine
*   **ark_aot_compiler**: Ahead-of-Time compiler
*   **ark_stub_compiler**: Stub compiler
*   **es2panda**: Panda assembler
*   **merge_abc**: ABC file merger
*   **profdump**: Profiling dump tool
*   **quick_fix**: Quick fix tool

## Troubleshooting

*   **"error while loading shared libraries"**: If you see this when running a tool, it means a required `.so` file was not copied to `dist/lib`. Check `build.js` and ensures the library is listed in the copy logic.
*   **"Permission denied"**: Ensure the scripts in `dist/bin` have execute permission (the build script attempts to set this).

