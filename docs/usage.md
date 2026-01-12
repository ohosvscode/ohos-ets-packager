# Usage Guide

This document provides examples of how to use the packaged OpenHarmony tools.

## 1. Basic Compilation and Execution

The most common workflow is compiling JavaScript source code into Ark Compiler bytecode (.abc) and running it.

### Compile JS to ABC

Use `es2abc` to compile your source file.

**Syntax:**
```bash
es2abc [options] input_file.js
```

**Example:**
```bash
# Compile foo.js to foo.abc
es2abc --output foo.abc foo.js

# Compile with debug info
es2abc --debug-info --output foo.abc foo.js
```

### Run Bytecode

Use `ark_js_vm` to execute the generated `.abc` file.

**Syntax:**
```bash
ark_js_vm [options] input_file.abc
```

**Example:**
```bash
ark_js_vm foo.abc
```

---

## 2. AOT Compilation (Ahead-of-Time)

You can compile bytecode to native code for performance using `ark_aot_compiler`.

**Syntax:**
```bash
ark_aot_compiler --aot-file=<output_filename> <input_abc_file>
```

**Example:**
```bash
# Generates foo.an (machine code)
ark_aot_compiler --aot-file foo.an foo.abc
```

---

## 3. Merging ABC Files

If you have multiple bytecode files, you can merge them using `merge_abc`.

**Syntax:**
```bash
merge_abc --output <output_file> --input <input_files>
```

---

## 4. Environment Variables

The wrapper scripts automatically handle library paths, so you **do not** need to set `LD_LIBRARY_PATH` manually.

However, some tools support standard options:
- `ARK_ETS_AOT_FILTER`: Filter for AOT compilation.
- `ARK_C_ICU_DATA`: Path to ICU data if customized.

## 5. Adding New Tools

If you need to add a new binary from the OpenHarmony build output (e.g., a new utility):

1.  Open `config.json`.
2.  Add the binary name to the `binaries` array:
    ```json
    "binaries": [
      "es2abc",
      ...,
      "new_tool_name"
    ]
    ```
3.  Re-run `node build.js`.
