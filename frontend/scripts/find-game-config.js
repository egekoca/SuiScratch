/**
 * Helper script to find GameConfig Object ID after contract deployment
 * 
 * Usage:
 * 1. Deploy contract: cd move && sui client publish --gas-budget 100000000
 * 2. Copy the transaction digest from the output
 * 3. Run: node scripts/find-game-config.js <TRANSACTION_DIGEST>
 * 
 * Or set the transaction digest in the script below
 */

const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');

const network = process.env.VITE_SUI_NETWORK || 'testnet';
const transactionDigest = process.argv[2] || 'YOUR_TRANSACTION_DIGEST_HERE';

if (transactionDigest === 'YOUR_TRANSACTION_DIGEST_HERE') {
  console.error('❌ Please provide transaction digest as argument');
  console.log('Usage: node scripts/find-game-config.js <TRANSACTION_DIGEST>');
  process.exit(1);
}

const suiClient = new SuiClient({
  url: getFullnodeUrl(network),
});

async function findGameConfig() {
  try {
    console.log(`🔍 Searching for GameConfig object in transaction: ${transactionDigest}`);
    console.log(`🌐 Network: ${network}\n`);

    const tx = await suiClient.getTransactionBlock({
      digest: transactionDigest,
      options: {
        showObjectChanges: true,
        showEffects: true,
      },
    });

    if (!tx.objectChanges) {
      console.error('❌ No object changes found in transaction');
      return;
    }

    // Find GameConfig object (shared object)
    const gameConfig = tx.objectChanges.find(
      (change) =>
        change.type === 'created' &&
        change.objectType?.includes('GameConfig')
    );

    if (gameConfig && 'objectId' in gameConfig) {
      console.log('✅ Found GameConfig Object ID:');
      console.log(`   ${gameConfig.objectId}\n`);
      console.log('📋 Add this to your .env file:');
      console.log(`   VITE_CONTRACT_GAME_CONFIG_ID=${gameConfig.objectId}\n`);
      
      // Also find Package ID if not already set
      const packageChange = tx.objectChanges.find(
        (change) => change.type === 'published'
      );
      
      if (packageChange && 'packageId' in packageChange) {
        console.log('📦 Package ID:');
        console.log(`   ${packageChange.packageId}\n`);
        console.log('📋 Add this to your .env file:');
        console.log(`   VITE_CONTRACT_PACKAGE_ID=${packageChange.packageId}\n`);
      }
    } else {
      console.log('⚠️  GameConfig object not found. Looking for all created objects...\n');
      
      const createdObjects = tx.objectChanges.filter(
        (change) => change.type === 'created'
      );
      
      console.log('📋 All created objects:');
      createdObjects.forEach((obj, idx) => {
        if ('objectId' in obj) {
          console.log(`   ${idx + 1}. ${obj.objectType || 'Unknown'}`);
          console.log(`      ID: ${obj.objectId}\n`);
        }
      });
      
      // Look for shared objects
      const sharedObjects = tx.objectChanges.filter(
        (change) => change.type === 'created' && 'objectId' in change
      );
      
      if (sharedObjects.length > 0) {
        console.log('💡 Tip: GameConfig is a shared object. Look for the object with type containing "GameConfig"');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('not found')) {
      console.log('\n💡 Make sure:');
      console.log('   1. Transaction digest is correct');
      console.log('   2. Network is correct (testnet/mainnet)');
      console.log('   3. Transaction has been finalized');
    }
  }
}

findGameConfig();

