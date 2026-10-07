// Mint the 11 Cardigan reserves on Festive Muses v2.
const { ethers } = require('ethers');
const fs = require('fs');

const OUT = '/home/hatch/workspace/festive-muses/contract/v2';
const META = '/home/hatch/workspace/festive-muses/metadata_final';
const RPC = 'https://rpc.mainnet.chain.robinhood.com';

function traitsFromAttributes(attrs) {
  return attrs.map(a => `${a.trait_type}: ${a.value}`).join(', ');
}

async function main() {
  const address = fs.readFileSync(OUT + '/contract-address.txt', 'utf8').trim();
  const abi = JSON.parse(fs.readFileSync(OUT + '/abi.json', 'utf8'));
  const cids = JSON.parse(fs.readFileSync('/home/hatch/workspace/festive-muses/metadata_cids.json', 'utf8'));

  const uris = [], names = [], souls = [], traitsList = [], contexts = [];
  for (let i = 1; i <= 11; i++) {
    const key = String(i).padStart(3, '0');
    const meta = JSON.parse(fs.readFileSync(`${META}/${key}.json`, 'utf8'));
    uris.push('ipfs://' + cids[String(i)]);
    names.push(meta.name);
    souls.push(meta.description);
    traitsList.push(traitsFromAttributes(meta.attributes));
    contexts.push(meta.properties.context);
  }
  console.log('names:', names.join(' | '));
  console.log('sample uri:', uris[0]);

  const provider = new ethers.JsonRpcProvider(RPC);
  const privateKey = fs.readFileSync('/home/hatch/workspace/wallets/spepe.key', 'utf8').trim();
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(address, abi, wallet);

  console.log('Calling mintReserve for 11 tokens...');
  const tx = await contract.mintReserve(uris, names, souls, traitsList, contexts);
  console.log('Mint tx:', tx.hash);
  fs.writeFileSync(OUT + '/reserve-mint-tx.txt', tx.hash + '\n');

  const receipt = await tx.wait();
  console.log('Confirmed in block', receipt.blockNumber);
  const minted = Number(await contract.totalMinted());
  console.log('totalMinted:', minted);
  if (minted !== 11) throw new Error('expected 11 minted, got ' + minted);

  // Verify ownership of tokens 1-11
  for (let i = 1; i <= 11; i++) {
    const owner = await contract.ownerOf(i);
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) throw new Error(`token ${i} owner mismatch`);
  }
  console.log('All 11 tokens owned by Cardigan. DONE');
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
