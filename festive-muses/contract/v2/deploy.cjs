// Deploy Festive Muses v2 from Cardigan's wallet. Saves everything.
const { ethers } = require('ethers');
const fs = require('fs');

const OUT = '/home/hatch/workspace/festive-muses/contract/v2';
const RPC = 'https://rpc.mainnet.chain.robinhood.com';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const privateKey = fs.readFileSync('/home/hatch/workspace/wallets/spepe.key', 'utf8').trim();
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log('Deployer:', wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log('Balance ETH:', ethers.formatEther(balance));
  if (balance < ethers.parseEther('0.001')) throw new Error('insufficient balance');

  const abi = JSON.parse(fs.readFileSync(OUT + '/abi.json', 'utf8'));
  const creationBytecode = fs.readFileSync(OUT + '/creation-bytecode.txt', 'utf8').trim();

  const factory = new ethers.ContractFactory(abi, creationBytecode, wallet);
  const feeData = await provider.getFeeData();
  console.log('Deploying... gasPrice:', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'gwei');

  const contract = await factory.deploy();
  const deployTx = contract.deploymentTransaction();
  console.log('Deploy tx:', deployTx.hash);
  fs.writeFileSync(OUT + '/deploy-tx.txt', deployTx.hash + '\n');

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log('Contract address:', address);
  fs.writeFileSync(OUT + '/contract-address.txt', address + '\n');

  const receipt = await provider.getTransactionReceipt(deployTx.hash);
  console.log('Block:', receipt.blockNumber, 'gas used:', receipt.gasUsed.toString());
  fs.writeFileSync(OUT + '/deploy-receipt.json', JSON.stringify({
    tx: deployTx.hash, address, blockNumber: Number(receipt.blockNumber),
    gasUsed: receipt.gasUsed.toString(),
  }, null, 2));

  // Fetch deployed runtime bytecode and compare with local
  const onchainCode = await provider.getCode(address);
  fs.writeFileSync(OUT + '/deployed-bytecode.txt', onchainCode + '\n');
  const localRuntime = fs.readFileSync(OUT + '/runtime-bytecode-local.txt', 'utf8').trim().toLowerCase();
  console.log('Onchain runtime matches local:', onchainCode.toLowerCase() === localRuntime);
  console.log('Onchain code bytes:', (onchainCode.length - 2) / 2);
  console.log('DONE');
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
