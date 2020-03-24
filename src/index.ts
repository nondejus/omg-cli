require("source-map-support").install();
const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
const fs = require("fs");
const JSONbig = require("json-bigint");
const sleep = require("sleep");
const optionDefs = require("./options");
const config = require("../config.js");

import { OMGCLI } from "./omgcli";
import { Util } from "./util";
import { Load } from "./load";

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
    Util.printObject(decodedTx, "");
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
    Util.printObject(result);
  } else if (options["getByzantineEvents"]) {
    const response = await omgcli.getStatus();

    if (response["byzantine_events"].length) {
      Util.printObject(response["byzantine_events"], "Byzantine events");
    } else {
      console.log("No Byzantine events");
    }
  } else if (options["getIFEId"]) {
    const exitId = await omgcli.getIFEId(options["getIFEId"]);
    console.log("Exit id: ", exitId);
  } else if (options["getIFEs"]) {
    const response = await omgcli.getStatus();

    if (response["in_flight_exits"].length) {
      Util.printObject(response["in_flight_exits"]);
    } else {
      console.log("No IFEs");
    }
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
  } else if (options["addExitQueue"]) {
    const txReceipt = await omgcli.addToken(options["addExitQueue"]);
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["getExitQueue"]) {
    const result = await omgcli.getExitQueue(options["getExitQueue"]);
    Util.printObject(result);
  } else if (options["processExits"]) {
    const txReceipt = await omgcli.processExits(options["processExits"]);
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["addFees"]) {
    const txRaw = fs.readFileSync(options["addFees"]);
    const tx = JSONbig.parse(txRaw);

    const newTx = await omgcli.addFeesToTx(tx);

    if (newTx) {
      Util.printObject(newTx);
    } else {
      console.log(`Error: Could not add fees to the tx`);
    }
  } else if (options["generateTx"]) {
    const utxo = await omgcli.getUTXO(
      omgcli.txOptions["from"],
      options["generateTx"]
    );

    if (utxo) {
      let inputs: any = [{}];
      inputs[0].blknum = utxo.blknum;
      inputs[0].txindex = utxo.txindex;
      inputs[0].oindex = utxo.oindex;

      let outputs: any = [{}];
      outputs[0].outputGuard = utxo.owner;
      outputs[0].currency = utxo.currency;
      outputs[0].amount = utxo.amount;
      outputs[0].outputType = 1;

      let tx: any = {
        transactionType: 1,
        inputs,
        outputs,
        metadata:
          "0x0000000000000000000000000000000000000000000000000000000000001337"
      };

      const newTx = await omgcli.addFeesToTx(tx);
      if (newTx) {
        Util.printObject(newTx);
      } else {
        console.log(`Error: Could not add fees to the tx`);
      }
    } else {
      console.log(`Error: Could not find UTXO`);
    }
  } else if (options["sendTx"]) {
    const txRaw = fs.readFileSync(options["sendTx"]);
    const tx = JSON.parse(txRaw);

    const txReceipt = await omgcli.sendTx(tx);
    Util.printOMGBlockExplorerLink(txReceipt.txhash, config);
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

    Util.printExplorerLinks(txReceipt, config);
  } else if (options["getIFEData"]) {
    const txRaw = fs.readFileSync(options["getIFEData"]);
    const tx = JSONbig.parse(txRaw);

    const ifeData = await omgcli.getIFEData(tx);
    Util.printObject(ifeData);
  } else if (options["startIFE"]) {
    const txRaw = fs.readFileSync(options["startIFE"]);
    const exitData = JSONbig.parse(txRaw);

    const receipt = await omgcli.startIFE(exitData);
    Util.printExplorerLinks(receipt, config);
  } else if (options["piggybackIFEOnInput"]) {
    const txReceipt = await omgcli.piggybackIFEOnInput(
      options["piggybackIFEOnInput"],
      options["inputIndex"]
    );
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["piggybackIFEOnOutput"]) {
    const txReceipt = await omgcli.piggybackIFEOnOutput(
      options["piggybackIFEOnOutput"],
      options["outputIndex"]
    );
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["getChallengeIFEInputSpentData"]) {
    const challengeData = await omgcli.getChallengeIFEInputSpentData(
      options["challengeIFEInputSpentData"],
      Number(options["inputIndex"])
    );
    Util.printObject(challengeData);
  } else if (options["challengeIFEInputSpent"]) {
    const challengeDataRaw = fs.readFileSync(options["challengeIFEInputSpent"]);
    const challengeData = JSONbig.parse(challengeDataRaw);

    const txReceipt = await omgcli.challengeIFEInputSpent(challengeData);
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["getChallengeIFEOutputSpentData"]) {
    const challengeData = await omgcli.getChallengeIFEOutputSpentData(
      options["challengeIFEOutputSpentData"],
      Number(options["outputIndex"])
    );
    Util.printObject(challengeData);
  } else if (options["challengeIFEOutputSpent"]) {
    const challengeDataRaw = fs.readFileSync(
      options["challengeIFEOutputSpent"]
    );
    const challengeData = JSONbig.parse(challengeDataRaw);

    const txReceipt = await omgcli.challengeIFEOutputSpent(challengeData);
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["challengeIFENotCanonical"]) {
    const challengeDataRaw = fs.readFileSync(
      options["challengeIFENotCanonical"]
    );
    const challengeData = JSONbig.parse(challengeDataRaw);

    const txReceipt = omgcli.challengeIFENotCanonical(challengeData);
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["deleteNonPiggybackedIFE"]) {
    const exitId = await omgcli.getIFEId(options["deleteNonPiggybackedIFE"]);

    const txReceipt = await omgcli.deleteNonPiggybackedIFE(exitId);
    Util.printExplorerLinks(txReceipt, config);
  } else if (options["autoChallenge"]) {
    console.log("---> Watching for Byzantine events <---");
    let processedEvents: String[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await omgcli.getStatus();

      for (const event of response["byzantine_events"]) {
        if (
          event.details.utxo_pos &&
          event.event === "invalid_exit" &&
          !processedEvents.includes(event.details.utxo_pos)
        ) {
          console.log(
            `Found Invalid SE exit for ${event.details.utxo_pos}. Challenge coming up.`
          );
          const challengeData = await omgcli.getSEChallengeData(
            event.details.utxo_pos
          );
          const receipt = await omgcli.challengeSE(challengeData);

          processedEvents.push(event.details.utxo_pos);

          console.log(`Challenge SE successful`);
          Util.printExplorerLinks(receipt, config);
          console.log("---");
        }
      }
      sleep.sleep(60);
    }
  } else if (options["parallelRuns"] && options["iterations"]) {
    const load = new Load(options["parallelRuns"], options["iterations"]);
    load.run();
  } else {
    const usage = commandLineUsage(optionDefs["optionDefinitions"]);
    console.log(usage);
  }
}
run();
