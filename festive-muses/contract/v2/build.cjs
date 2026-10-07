// Build Festive Muses v2 with FULLY PINNED settings.
// solc 0.8.24 | OZ 5.1.0 | optimizer 200 runs | viaIR true | evmVersion cancun
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const OUT = '/home/hatch/workspace/festive-muses/contract/v2';
const OZ = '/tmp/oz-src/openzeppelin-contracts-5.1.0/contracts';
const MAIN = '/home/hatch/workspace/festive-muses/contract/FestiveMuses.sol';

const SETTINGS = {
  solcVersion: '0.8.24',
  ozVersion: '5.1.0',
  optimizer: { enabled: true, runs: 200 },
  viaIR: true,
  evmVersion: 'cancun',
};

function resolveImports(source, baseDir, collected) {
  const importRe = /import\s+(?:[^'"]*from\s+)?["']([^"']+)["']/g;
  let m;
  while ((m = importRe.exec(source)) !== null) {
    const p = m[1];
    let filePath;
    if (p.startsWith('@openzeppelin/contracts/')) {
      filePath = path.join(OZ, p.replace('@openzeppelin/contracts/', ''));
    } else if (p.startsWith('./') || p.startsWith('../')) {
      filePath = path.resolve(baseDir, p);
    } else continue;
    if (collected[filePath]) continue;
    if (!fs.existsSync(filePath)) throw new Error('missing import: ' + filePath + ' (from ' + p + ')');
    collected[filePath] = true;
    resolveImports(fs.readFileSync(filePath, 'utf8'), path.dirname(filePath), collected);
  }
}

function main() {
  const mainSrc = fs.readFileSync(MAIN, 'utf8');
  const collected = {};
  resolveImports(mainSrc, path.dirname(MAIN), collected);

  const sources = { 'FestiveMuses.sol': { content: mainSrc } };
  const ozFiles = [];
  for (const fp of Object.keys(collected)) {
    const content = fs.readFileSync(fp, 'utf8');
    let key;
    if (fp.startsWith(OZ)) {
      key = '@openzeppelin/contracts/' + path.relative(OZ, fp).split(path.sep).join('/');
    } else {
      key = path.basename(fp);
    }
    sources[key] = { content };
    if (key.startsWith('@openzeppelin/')) ozFiles.push(key);
  }
  ozFiles.sort();

  const stdJson = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: SETTINGS.optimizer,
      evmVersion: SETTINGS.evmVersion,
      viaIR: SETTINGS.viaIR,
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata'] } },
    },
  };

  fs.writeFileSync(path.join(OUT, 'standard-json.json'), JSON.stringify(stdJson, null, 1));
  fs.writeFileSync(path.join(OUT, 'compile-settings.json'), JSON.stringify({
    ...SETTINGS,
    sourceFile: 'FestiveMuses.sol',
    ozFiles,
    compiledAt: new Date().toISOString(),
  }, null, 2));

  // Save the exact OZ files used for reproducibility
  const ozDir = path.join(OUT, 'oz-5.1.0');
  for (const key of ozFiles) {
    const dest = path.join(ozDir, key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, sources[key].content);
  }

  const solcVersion = solc.version();
  console.log('solc-js reports:', solcVersion);

  const output = JSON.parse(solc.compile(JSON.stringify(stdJson)));
  const errors = (output.errors || []).filter(e => e.severity === 'error');
  if (errors.length) {
    console.error('COMPILE ERRORS:');
    for (const e of errors) console.error(e.formattedMessage);
    process.exit(1);
  }
  const warnings = (output.errors || []).filter(e => e.severity === 'warning');
  console.log(`warnings: ${warnings.length}, sources compiled: ${Object.keys(sources).length}`);

  const contract = output.contracts['FestiveMuses.sol']['FestiveMuses'];
  fs.writeFileSync(path.join(OUT, 'abi.json'), JSON.stringify(contract.abi, null, 1));
  fs.writeFileSync(path.join(OUT, 'creation-bytecode.txt'), '0x' + contract.evm.bytecode.object);
  fs.writeFileSync(path.join(OUT, 'runtime-bytecode-local.txt'), '0x' + contract.evm.deployedBytecode.object);

  // solc metadata: record the exact compiler version string embedded in metadata
  const metadata = JSON.parse(contract.metadata);
  fs.writeFileSync(path.join(OUT, 'solc-metadata.json'), JSON.stringify(metadata, null, 1));
  console.log('metadata compiler version:', metadata.compiler.version);

  console.log('creation bytecode bytes:', contract.evm.bytecode.object.length / 2);
  console.log('runtime bytecode bytes:', contract.evm.deployedBytecode.object.length / 2);
  console.log('DONE');
}

main();
