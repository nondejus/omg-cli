const { transaction } = require("omg-js/packages/omg-js-util/src");
const ChildChain = require("omg-js/packages/omg-js-childchain/src/childchain");
const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
const config = require("../config.js");
const rootChainI = require("./rootChainI.js");
const { optionDefinitions } = require("./options");
const fs = require("fs");

const childChain = new ChildChain({
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url
});

async function main() {
  const options = commandLineArgs(optionDefinitions[1]["optionList"]);

  if (options["decode"]) {
    const decodedTx = transaction.decodeTxBytes(options["decode"]);

    const txBody = {
      transactionType: decodedTx["transactionType"],
      inputs: decodedTx["inputs"],
      outputs: decodedTx["outputs"],
      metadata: decodedTx["metadata"],
      signatures: decodedTx["sigs"]
    };

    console.log(`RLP decoded tx: \n ${JSON.stringify(txBody, undefined, 2)}`);
  } else if (options["getUTXOs"]) {
    const utxos = await childChain.getUtxos(options["getUTXOs"]);
    console.log(`UTXOs: ${JSON.stringify(utxos, undefined, 2)}`);
  } else if (options["getExitPeriod"]) {
    const time = await rootChainI.getTimeToExit();
    console.log(`Min exit period in seconds: ${time}`);
  } else if (options["encode"]) {
    const txRaw = fs.readFileSync(options["encode"]);
    const tx = JSON.parse(txRaw);
    const encodedTx = transaction.encode(tx);
    console.log(`RLP encoded tx in ${options["encode"]}: \n`);
    console.log(encodedTx);
  } else if (options["transaction"]) {
    const txRaw = fs.readFileSync(options["transaction"]);
    const tx = JSON.parse(txRaw);
    const typedData = transaction.getTypedData(
      tx,
      config.rootchain_plasma_contract_address
    );
    const privateKeys = new Array(tx.inputs.length).fill(
      config.alice_eth_address_private_key
    );
    const signatures = childChain.signTransaction(typedData, privateKeys);
    const signedTxn = childChain.buildSignedTransaction(typedData, signatures);
    let receipt = await childChain.submitTransaction(signedTxn);
    console.log("Transaction submitted: ", receipt.txhash);
  } else if (options["getSEData"]) {
    const utxo = transaction.decodeUtxoPos(options["getSEData"]);
    const exitData = await childChain.getExitData(utxo);
    console.log(JSON.stringify(exitData, null, 2));
  } else if (options["startSE"]) {
    const exitDataRaw = fs.readFileSync(options["startSE"]);
    const exitData = JSON.parse(exitDataRaw);
    const receipt = await rootChainI.startStandardExit(exitData);

    console.log(`RootChain.startExit(): txhash = ${receipt.transactionHash}`);
  } else if (options["challengeSE"]) {
    const challengeDataRaw = fs.readFileSync(options["challengeSE"]);
    const challengeData = JSON.parse(challengeDataRaw);
    challengeData.exit_id = challengeData.exit_id;

    const receipt = await rootChainI.challengeStandardExit(challengeData);

    console.log(
      `RootChain.challengeStandardExit(): txhash = ${receipt.transactionHash}`
    );
  } else if (options["startIFE"]) {
    const txRaw = fs.readFileSync(options["startIFE"]);
    const tx = JSON.parse(txRaw);
    const IFEData = await childChain.inFlightExitGetData(
      transaction.encode(tx)
    );
    console.log(IFEData);
  } else if (options["getSEChallengeData"]) {
    let challengeData = await childChain.getChallengeData(
      options["getSEChallengeData"]
    );

    challengeData.exit_id = challengeData.exit_id.toFixed();
    console.log(JSON.stringify(challengeData, null, 2));
  } else if (options["processExits"]) {
    const receipt = await rootChainI.processExits(options["processExits"]);

    console.log(
      `RootChain.processExits(): txhash = ${receipt.transactionHash}`
    );
  } else {
    const usage = commandLineUsage(optionDefinitions);
    console.log(usage);
    return;
  }
}

function printObject(message, o) {
  console.log(`${message}: ${JSON.stringify(o, undefined, 2)}`);
}

main();
