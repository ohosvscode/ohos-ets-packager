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

    // 2. Copy binaries and create wrappers
    console.log("Processing binaries...");
    const wrapperTemplate = fs.readFileSync(path.join(__dirname, 'templates/wrapper.sh'), 'utf8');
    const binMap = {};

    config.binaries.forEach(binaryName => {
        let srcPath = path.join(FRONTEND_DIR, binaryName);
        if (!fs.existsSync(srcPath)) {
            srcPath = path.join(RUNTIME_DIR, binaryName);
        }

        if (fs.existsSync(srcPath)) {
            // Copy binary to lib (hidden away)
            const destLibPath = path.join(LIB_DIR, binaryName);
            copyFile(srcPath, destLibPath);
            fs.chmodSync(destLibPath, '755');

            // Create wrapper in bin
            const wrapperContent = wrapperTemplate.replace(/%BINARY_NAME%/g, binaryName);
            const destBinPath = path.join(BIN_DIR, binaryName);
            fs.writeFileSync(destBinPath, wrapperContent);
            fs.chmodSync(destBinPath, '755');
            console.log(`Created wrapper: ${destBinPath}`);

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
