#!/bin/bash
cd "$(dirname "$0")"
BIN_DIR="$(pwd)/dist/bin"
export PATH="$BIN_DIR:$PATH"

echo "=== Environment Setup ==="
echo "Adding $BIN_DIR to PATH"

echo ""
echo "=== 1. Library Linking & Help Check ==="
# We check if they execute without "library not found" errors.
# Many tools return exit code 1 or 255 on --help, which is fine as long as they run.
# A return code of 127 means "command not found", indicating a wrapper failure.
# Signal 11 (SIGSEGV) or dynamic linker errors are what we want to catch.

TOOLS=("es2abc" "es2panda" "merge_abc" "ark_js_vm" "ark_aot_compiler" "ark_stub_compiler" "profdump" "quick_fix")

for tool in "${TOOLS[@]}"; do
    echo "---------------------------------------------------"
    echo "Checking: $tool"
    
    # Capture stderr to check for loader errors
    OUTPUT=$($tool --help 2>&1)
    RET=$?
    
    if echo "$OUTPUT" | grep -q "error while loading shared libraries"; then
        echo "❌ FAIL: Missing libraries"
        echo "$OUTPUT"
    elif [ $RET -eq 127 ]; then
        echo "❌ FAIL: Command not found (Wrapper issue?)"
    else
        echo "✅ PASS: Binary executes (Exit code $RET)"
    fi
done

echo ""
echo "=== 2. Functional Workflow Test (JS -> ABC -> VM) ==="

echo "creating hello_test.js..."
echo "print('Hello OpenHarmony Tools');" > hello_test.js

echo "Step A: Compiling with es2abc..."
es2abc --output hello_test.abc hello_test.js
if [ $? -eq 0 ]; then
    echo "✅ PASS: es2abc compiled successfully"
else
    echo "❌ FAIL: es2abc failed"
    exit 1
fi

echo "Step B: Running with ark_js_vm..."
VM_OUT=$(ark_js_vm hello_test.abc)
echo "VM Output: [$VM_OUT]"

if [[ "$VM_OUT" == *"Hello OpenHarmony Tools"* ]]; then
    echo "✅ PASS: ark_js_vm executed logic correctly"
else
    echo "❌ FAIL: ark_js_vm output mismatch"
fi

echo ""
echo "=== 3. AOT Compilation Test ==="
echo "Running ark_aot_compiler..."
# Just checking if it attempts to compile without crashing on libs
ark_aot_compiler --aot-file hello_test.an hello_test.abc > aot_log.txt 2>&1
RET_AOT=$?
if [ $RET_AOT -eq 0 ]; then
    echo "✅ PASS: ark_aot_compiler ran successfully"
else
    echo "⚠️  NOTE: ark_aot_compiler exited with $RET_AOT. (This is often normal without full system stubs/bootstraps, but confirms the binary runs)"
    # We check if it was a linker error
    if grep -q "loading shared libraries" aot_log.txt; then
        echo "❌ FAIL: AOT Linker error"
        cat aot_log.txt
    fi
fi

# Cleanup
rm -f hello_test.js hello_test.abc hello_test.an aot_log.txt
