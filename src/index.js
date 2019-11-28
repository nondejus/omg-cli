const { transaction } = require("omg-js/packages/omg-js-util/src");
const ChildChain = require("omg-js/packages/omg-js-childchain/src/childchain");
const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
const config = require("../config.js");
const rootChainI = require("./rootChainI.js");
const fs = require("fs");
const chalk = require("chalk");

const banner = fs.readFileSync("./static/header.txt").toString();

const childChain = new ChildChain({
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url
});

const optionDefinitions = [
  {
    content: chalk.green(banner),
    raw: true
  },
  {
    header: "Options",
    optionList: [
      {
        name: "decode",
        alias: "d",
        type: String,
        typeLabel: "{underline rlpMsg}",
        description: "Decode an RLP encoded tx"
      },
      {
        name: "encode",
        alias: "e",
        type: String,
        typeLabel: "{underline file}",
        description: "Encode a tx from a json file"
      },
      {
        name: "transaction",
        alias: "t",
        type: String,
        typeLabel: "{underline file}",
        description: "Send a transaction on the plasma chain from json file"
      },
      {
        name: "getUTXOs",
        alias: "u",
        type: String,
        typeLabel: "{underline address}",
        description: "Get all UTXOs for an owner address"
      },
      {
        name: "getExitPeriod",
        type: Boolean,
        description: "Get minimum exit period in seconds"
      },
      {
        name: "getSEData",
        type: String,
        typeLabel: "{underline utxo}",
        description: "Get standard exit data for a UTXO"
      },
      {
        name: "startSE",
        type: String,
        typeLabel: "{underline exitDataFile}",
        description: "Start a standard exit"
      },
      {
        name: "getSEChallengeData",
        type: String,
        typeLabel: "{underline utxo}",
        description: "Get standard exit challenge data for a UTXO"
      },
      {
        name: "challengeSE",
        type: String,
        typeLabel: "{underline challengeDataFile}",
        description: "Challenge a standard exit"
      },
      {
        name: "startIFE",
        type: String,
        typeLabel: "{underline IFEDataFile}",
        description: "Start an IN-Flight exit"
      },
      {
        name: "processExits",
        type: String,
        typeLabel: "{underline address}",
        description: "Process exits for a specific token"
      },
      {
        name: "help",
        description: "Print this usage guide.",
        alias: "h",
        typeLabel: " ",
        defaultOption: true
      }
    ]
  }
];

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
