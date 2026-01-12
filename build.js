const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load config
const config = require('./config.json');

const DIST_DIR = path.join(__dirname, 'dist');
const BIN_DIR = path.join(DIST_DIR, 'bin');
const LIB_DIR = path.join(DIST_DIR, 'lib');

// Helper to remove dir
function cleanDist() {
    if (fs.existsSync(DIST_DIR)) {
        fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DIST_DIR);
    fs.mkdirSync(BIN_DIR);
    fs.mkdirSync(LIB_DIR);
}

// Helper to copy file
function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied: ${src} -> ${dest}`);
    } else {
        console.warn(`Warning: Source file not found: ${src}`);
    }
}

// Helper to recursively copy files with extension
function copyFilesByExt(srcDir, destDir, ext) {
    if (!fs.existsSync(srcDir)) return;
    const files = fs.readdirSync(srcDir);
    files.forEach(file => {
        if (file.endsWith(ext)) {
            copyFile(path.join(srcDir, file), path.join(destDir, file));
        }
    });
}

function build() {
    console.log("Starting build...");
    cleanDist();

    const OHOS_OUT = path.join(config.ohosRoot, config.outDirRelative);
    const FRONTEND_DIR = path.join(OHOS_OUT, config.frontend);
    const RUNTIME_DIR = path.join(OHOS_OUT, config.runtime);

    // 1. Copy libraries (.so)
    console.log("Copying libraries...");
    // Copy libraries from frontend and runtime
    copyFilesByExt(FRONTEND_DIR, LIB_DIR, '.so');
    copyFilesByExt(RUNTIME_DIR, LIB_DIR, '.so');
    
    // Copy thirdparty libraries
    Object.keys(config.thirdparty).forEach(key => {
        const libPath = path.join(OHOS_OUT, config.thirdparty[key]);
        copyFilesByExt(libPath, LIB_DIR, '.so');
    });

    // PATCH LIBRARIES: Ensure libraries can find each other in the same directory
    console.log("Patching shared libraries (rpath)...");
    const libFiles = fs.readdirSync(LIB_DIR);
    libFiles.forEach(file => {
        if (file.endsWith('.so')) {
            const libPath = path.join(LIB_DIR, file);
            try {
                // Set RPATH to $ORIGIN so libs can find their neighbors
                execSync(`patchelf --set-rpath '$ORIGIN' "${libPath}"`);
            } catch (e) {
                console.warn(`Failed to patch library ${file}: ${e.message}`);
            }
        }
    });

    // 2. Copy binaries, patch rpath, and create symlinks
    console.log("Processing binaries...");
    
    // Check for patchelf
    try {
        execSync('patchelf --version');
    } catch {
        console.error("Error: 'patchelf' is required but not found in PATH.");
        process.exit(1);
    }

    const binMap = {};

    config.binaries.forEach(binaryName => {
        let srcPath = path.join(FRONTEND_DIR, binaryName);
        if (!fs.existsSync(srcPath)) {
            srcPath = path.join(RUNTIME_DIR, binaryName);
        }

        if (fs.existsSync(srcPath)) {
            // Copy binary directly to bin directory (no longer hidden in lib)
            // But wait, to keep structure clean and allow $ORIGIN/../lib to work nicely regardless of symlinks,
            // we will put the real binary in dist/bin/
            
            // Strategy: 
            // 1. Put binary in dist/bin/
            // 2. Patch rpath to $ORIGIN/../lib
            
            const destBinPath = path.join(BIN_DIR, binaryName);
            copyFile(srcPath, destBinPath);
            fs.chmodSync(destBinPath, '755');

            // Patch RPATH
            try {
                // $ORIGIN is a literal string for the loader, so we must escape it for shell if needed. 
                // But in node execSync with string, simple quoting works.
                // We want rpath to be: $ORIGIN/../lib
                const rpathCMD = `patchelf --set-rpath '$ORIGIN/../lib' "${destBinPath}"`;
                execSync(rpathCMD);
                console.log(`Patched RPATH for: ${binaryName}`);
            } catch (e) {
                console.warn(`Failed to patch ${binaryName}: ${e.message}`);
            }

            binMap[binaryName] = `./bin/${binaryName}`;
        } else {
            console.warn(`Warning: Binary not found in frontend or runtime dirs: ${binaryName}`);
        }
    });

    // 3. Generate package.json
    console.log("Generating package.json...");
    const pkgJson = {
        ...config.npmPackage,
        bin: binMap,
        files: ['bin', 'lib']
    };
    fs.writeFileSync(path.join(DIST_DIR, 'package.json'), JSON.stringify(pkgJson, null, 2));

    console.log("\nBuild complete!");
    console.log(`Artifacts are in: ${DIST_DIR}`);
    console.log("To use: cd dist && npm link");
}

build();
