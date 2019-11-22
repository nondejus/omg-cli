const { transaction } = require('./node_modules/omg-js/packages/omg-js-util/src')
const RootChain = require('./node_modules/omg-js/packages/omg-js-rootchain/src/rootchain')
const ChildChain = require('./node_modules/omg-js/packages/omg-js-childchain/src/childchain')
const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')
const Web3 = require('web3')
const config = require('./config.js')
const fs = require('fs');

const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url))
const childChain = new ChildChain({ watcherUrl: config.watcher_url, watcherProxyUrl: config.watcher_proxy_url })
const rootChain = new RootChain(web3, config.rootchain_plasma_contract_address)


const optionDefinitions = [
    {
      header: 'Utility cli tool to test the OMG network',
    },
    {
      header: 'Options',
      optionList: [
        {
          name: 'decode',
          alias: 'd', 
          type: String,
          description: 'decode a tx'
        },
        {
            name: 'encode',
            alias: 'e', 
            type: String,
            description: 'encode a tx from a file'
        },
        {
            name: 'transaction',
            alias: 't', 
            type: String,
            description: 'send a transaction on the plasma chain from file'
        },
        {
          name: 'help',
          description: 'Print this usage guide.',
          alias: 'h', 
          defaultOption: true
        }
      ]
    }
  ]


async function main()  {
    const options = commandLineArgs(optionDefinitions[1]['optionList'])

    if (options['decode']){
        const decodedTx = transaction.decodeTxBytes(options['decode'])
    
        const txBody = {
            transactionType: decodedTx['transactionType'],
            inputs: decodedTx['inputs'],
            outputs: decodedTx['outputs'],
            metadata: decodedTx['metadata'],
            signatures : decodedTx['sigs']
        }
    
        console.log(`RLP decoded tx: \n ${JSON.stringify(txBody, undefined, 2) }`);
    
      
    } else if (options['encode']){
        const txRaw = fs.readFileSync(options['encode']);
        const tx = JSON.parse(txRaw);
        const encodedTx = transaction.encode(tx)
        console.log(`RLP encoded tx in ${options['encode']}: \n`)
        console.log(encodedTx)
    
    } else if (options['transaction']){
        const txRaw = fs.readFileSync(options['transaction']);
        const tx = JSON.parse(txRaw);
        const typedData = transaction.getTypedData(tx, config.rootchain_plasma_contract_address)
        const privateKeys = new Array(tx.inputs.length).fill(config.alice_eth_address_private_key)
        const signatures = childChain.signTransaction(typedData, privateKeys)
        const signedTxn = childChain.buildSignedTransaction(typedData, signatures)
        const receipt = await childChain.submitTransaction(signedTxn)
        console.log('Transaction submitted: ', receipt.txhash)
    } else{
        const usage = commandLineUsage(optionDefinitions)
        console.log(usage)
        return;
    }
        
} 



async function startStandardExit(utxoPos) {
    const exitData = await childChain.getExitData(transaction.decodeUtxoPos(utxoPos))

    printObject("Exit Data: \n", exitData )

    let receipt = await rootChain.startStandardExit(
        exitData.utxo_pos,
        exitData.txbytes,
        exitData.proof,
        {
          privateKey: config.alice_eth_address_private_key,
          from: config.alice_eth_address,
          gas: 1000000
        }
      )
    console.log(`Alice called RootChain.startExit(): txhash = ${receipt.transactionHash}`)
}


function printObject(message, o){
    console.log(`${message}: ${JSON.stringify(o, undefined, 2) }`)
}

main()