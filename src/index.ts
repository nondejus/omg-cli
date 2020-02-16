require("source-map-support").install();
const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
const fs = require("fs");
const JSONbig = require("json-bigint");
const optionDefs = require("./options");
const config = require("../config.js");

import { OMGCLI } from "./omgcli";
import { Util } from "./util";

let optionsLists: object[] = [];

const omgcli = new OMGCLI(config);

async function run() {
  for (const section of optionDefs["optionDefinitions"].slice(
    1,
    optionDefs["optionDefinitions"].length
  )) {
    optionsLists = optionsLists.concat(section["optionList"]);
  }
  const options = commandLineArgs(optionsLists);

  if (options["setTxOptions"]) {
    const txOptionsRaw = fs.readFileSync(options["setTxOptions"]);
    const txOptions = JSON.parse(txOptionsRaw);
    omgcli.txOptions["privateKey"] = txOptions["privateKey"];
    omgcli.txOptions["from"] = txOptions["from"];
  }

  if (options["decode"]) {
    const decodedTx = omgcli.decode(options["decode"]);
    Util.printObject(decodedTx, "RLP decoded tx");
  } else if (options["getUTXOs"]) {
    const utxos = await omgcli.getUTXOs(options["getUTXOs"]);
    Util.printObject(utxos);
  } else if (options["getExitPeriod"]) {
    const exitPeriod = await omgcli.getExitPeriod();
    console.log(`Exit period in seconds: ${exitPeriod}`);
  } else if (options["getBalance"]) {
    const balance = await omgcli.getUTXOs(options["getBalance"]);
    Util.printObject(balance);
  } else if (options["getFees"]) {
    Util.printObject(await omgcli.getFees());
  } else if (options["encode"]) {
    const result = omgcli.encode(options["encode"]);
    console.log(`Encoded Tx without signature: ${result.tx}`);
    console.log(`Encoded Tx with signature: ${result.signedTx}`);
  } else if (options["deposit"]) {
    let result;
    if (options["amount"]) {
      result = await omgcli.deposit(options["deposit"], options["amount"]);
    } else {
      result = await omgcli.deposit(options["deposit"]);
    }

    if (result.approvalReceipt) {
      console.log(`Asset ${options["deposit"]} approval successful`);
      Util.printEtherscanLink(result.approvalReceipt.transactionHash, config);
    }

    console.log(`Deposit ${options["deposit"]} successful`);
    Util.printExplorerLinks(result.depositReceipt, config);
  } else if (options["getSEData"]) {
    Util.printObject(await omgcli.getSEData(parseInt(options["getSEData"])));
  } else if (options["startSE"]) {
    const exitDataRaw = fs.readFileSync(options["startSE"]);
    const exitData = JSONbig.parse(exitDataRaw);

    const txReceipt = await omgcli.startSE(exitData);

    Util.printExplorerLinks(txReceipt, config);
  } else if (options["getSEChallengeData"]) {
    Util.printObject(
      await omgcli.getSEChallengeData(parseInt(options["getSEChallengeData"]))
    );
  } else if (options["challengeSE"]) {
    const challengeDataRaw = fs.readFileSync(options["challengeSE"]);
    const challengeData = JSONbig.parse(challengeDataRaw);

    const txReceipt = await omgcli.challengeSE(challengeData);

    Util.printEtherscanLink(txReceipt.transactionHash, config);
  } else if (options["getIFEData"]) {
    const txRaw = fs.readFileSync(options["getIFEData"]);
    const tx = JSONbig.parse(txRaw);

    const ifeData = await omgcli.getIFEData(tx);
    Util.printObject(ifeData);
  } else if (options["startIFE"]) {
    const txRaw = fs.readFileSync(options["startIFE"]);
    const exitData = JSONbig.parse(txRaw);

    const receipt = await omgcli.startSE(exitData);
    Util.printEtherscanLink(receipt.transactionHash, config);
  } else {
    const usage = commandLineUsage(optionDefs["optionDefinitions"]);
    console.log(usage);
  }
}
run();
