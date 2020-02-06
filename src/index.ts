const { transaction } = require("@omisego/omg-js-util/src");
const ChildChain = require("@omisego/omg-js-childchain/src/childchain");
const RootChain = require("@omisego/omg-js-rootchain/src/rootchain");
const txUtils = require("@omisego/omg-js-rootchain/src/txUtils");

const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
const fs = require("fs");
const BigNumber = require("bignumber.js");
const BN = require("bn.js");

const config = require("../config.js");
const optionDefs = require("./options");

const sleep = require("sleep");

const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node));

const childChain = new ChildChain({
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url
});

const rootChain = new RootChain({
  web3,
  plasmaContractAddress: config.plasmaframework_contract_address
});

let optionsLists: Object[] = [];
for (const section of optionDefs["optionDefinitions"].slice(
  1,
  optionDefs["optionDefinitions"].length
)) {
  optionsLists = optionsLists.concat(section["optionList"]);
}

const options = commandLineArgs(optionsLists);

const aliceTxOptions = {
  privateKey: config.alice_eth_address_private_key,
  from: config.alice_eth_address
};

let txOptions: any;

async function omgJSMain(options: any) {
  if (options["setTxOptions"]) {
    const txOptionsRaw = fs.readFileSync(options["setTxOptions"]);
    txOptions = JSON.parse(txOptionsRaw);
  } else {
    txOptions = aliceTxOptions;
  }
  txOptions["gas"] = 6000000;

  if (options["decode"]) {
    const decodedTx = transaction.decodeTxBytes(options["decode"]);
    printObject("RLP decoded tx", decodedTx);
  } else if (options["getUTXOs"]) {
    const utxos = await childChain.getUtxos(options["getUTXOs"]);
    printObject("", utxos);
  } else if (options["getExitPeriod"]) {
    const minExitPeriod = await rootChain.plasmaContract.methods
      .minExitPeriod()
      .call();

    console.log(minExitPeriod);
    return Number(minExitPeriod);
  } else if (options["encode"]) {
    const txRaw = fs.readFileSync(options["encode"]);
    const tx = JSON.parse(txRaw);
    const typedData = transaction.getTypedData(
      tx,
      config.plasmaframework_contract_address
    );

    const privateKeys = new Array(tx.inputs.length).fill(txOptions.privateKey);
    const signatures = childChain.signTransaction(typedData, privateKeys);

    const signedTxn = childChain.buildSignedTransaction(typedData, signatures);

    console.log(`Signature: ${signatures}`);
    console.log(`Encoded Tx without signature: ${transaction.encode(tx)}`);
    console.log(`Encoded Tx with signature: ${signedTxn}`);
  } else if (options["deposit"]) {
    let amount = options["amount"];

    if (fs.existsSync(options["deposit"])) {
      const txRaw = fs.readFileSync(options["deposit"]);
      const tx = JSON.parse(txRaw);
      const encodedTx = transaction.encode(tx);

      const isEth = tx.outputs[0].currency === transaction.ETH_CURRENCY;
      const { address, contract } = isEth
        ? await rootChain.getEthVault()
        : await rootChain.getErc20Vault();

      if (!isEth) {
        const approvalReceipt = await rootChain.approveToken({
          erc20Address: config.erc20_contract,
          amount: config.alice_erc20_deposit_amount,
          txOptions: txOptions
        });
        console.log("ERC20 approval successful");
        printEtherscanLink(approvalReceipt.transactionHash);
      }

      const txDetails = {
        from: aliceTxOptions.from,
        to: address,
        ...(isEth ? { value: amount } : {}),
        data: txUtils.getTxData(web3, contract, "deposit", encodedTx),
        gas: txOptions.gas
      };
      const depositReceipt = await txUtils.sendTx({
        web3: web3,
        txDetails,
        privateKey: txOptions.privateKey
      });
      if (isEth) {
        console.log(`ETH deposit from raw tx successful`);
      } else {
        console.log(`Token deposit from raw tx successful`);
      }

      printEtherscanLink(depositReceipt.transactionHash);
      return depositReceipt;
    } else if (
      options["deposit"] == "0x0000000000000000000000000000000000000000"
    ) {
      if (!options["amount"]) {
        amount = new BN(
          web3.utils.toWei(config.alice_eth_deposit_amount, "ether")
        );
      }

      console.log(
        `Depositing ${web3.utils.fromWei(
          amount.toString(),
          "ether"
        )} ETH from ${txOptions.from} from the rootchain to the childchain`
      );
      const depositReceipt = await rootChain.deposit({
        amount: amount,
        currency: options["deposit"],
        txOptions: txOptions
      });
      console.log("ETH deposit successful");
      printEtherscanLink(depositReceipt.transactionHash);
      console.log("Funds can be spent after cool down of 10 ETH blocks");
      return depositReceipt;
    } else {
      if (!options["amount"]) {
        amount = config.alice_erc20_deposit_amount;
      }

      const approvalReceipt = await rootChain.approveToken({
        erc20Address: config.erc20_contract,
        amount: amount,
        txOptions: txOptions
      });
      console.log("ERC20 approved: ", approvalReceipt.transactionHash);

      console.log(
        `Depositing ${config.alice_erc20_deposit_amount} ERC20 from the rootchain to the childchain`
      );
      const depositReceipt = await rootChain.deposit({
        amount: amount,
        currency: options["deposit"],
        txOptions: txOptions
      });

      console.log("Token deposit successful");
      printEtherscanLink(depositReceipt.transactionHash);
      return depositReceipt;
    }
  } else if (options["transaction"]) {
    const txRaw = fs.readFileSync(options["transaction"]);
    const tx = JSON.parse(txRaw);
    const typedData = transaction.getTypedData(
      tx,
      config.plasmaframework_contract_address
    );

    const privateKeys = new Array(tx.inputs.length).fill(txOptions.privateKey);
    const signatures = childChain.signTransaction(typedData, privateKeys);

    const signedTxn = childChain.buildSignedTransaction(typedData, signatures);
    printObject("Signed Tx", signedTxn);

    let receipt = await childChain.submitTransaction(signedTxn);
    printObject("Tx receipt", receipt);
    printOMGBlockExplorerLink(receipt.txhash);
    return receipt;
  } else if (options["getSEData"]) {
    const utxo = transaction.decodeUtxoPos(options["getSEData"]);
    const exitData = await childChain.getExitData(utxo);
    printObject("", exitData);
    return exitData;
  } else if (options["startSE"]) {
    const exitDataRaw = fs.readFileSync(options["startSE"]);
    const exitData = JSON.parse(exitDataRaw);

    const receipt = await rootChain.startStandardExit({
      utxoPos: exitData.utxo_pos,
      outputTx: exitData.txbytes,
      inclusionProof: exitData.proof,
      txOptions: txOptions
    });

    printEtherscanLink(receipt.transactionHash);
    return receipt;
  } else if (options["getSEChallengeData"]) {
    const utxoPos = parseInt(options["getSEChallengeData"]);
    let challengeData = await childChain.getChallengeData(utxoPos);

    const number = new BigNumber(challengeData.exit_id);
    challengeData.exit_id = number.toFixed();
    console.log(JSON.stringify(challengeData, null, 2));
  } else if (options["challengeSE"]) {
    const challengeDataRaw = fs.readFileSync(options["challengeSE"]);
    const challengeData = JSON.parse(challengeDataRaw);

    challengeData.exit_id = new BN(challengeData.exit_id);

    const receipt = await rootChain.challengeStandardExit({
      standardExitId: challengeData.exit_id,
      exitingTx: challengeData.exiting_tx,
      challengeTx: challengeData.txbytes,
      inputIndex: challengeData.input_index,
      challengeTxSig: challengeData.sig,
      txOptions: txOptions
    });

    printEtherscanLink(receipt.transactionHash);
    return receipt;
  } else if (options["getIFEData"]) {
    const txRaw = fs.readFileSync(options["getIFEData"]);
    const tx = JSON.parse(txRaw);
    const typedData = transaction.getTypedData(
      tx,
      config.plasmaframework_contract_address
    );

    const privateKeys = new Array(tx.inputs.length).fill(txOptions.privateKey);

    const signatures = childChain.signTransaction(typedData, privateKeys);
    const signedTxn = childChain.buildSignedTransaction(typedData, signatures);

    const IFEData = await childChain.inFlightExitGetData(signedTxn);
    printObject("", IFEData);
  } else if (options["startIFE"]) {
    const txRaw = fs.readFileSync(options["startIFE"]);
    const exitData = JSON.parse(txRaw);

    const receipt = await rootChain.startInFlightExit({
      inFlightTx: exitData.in_flight_tx,
      inputTxs: exitData.input_txs,
      inputUtxosPos: exitData.input_utxos_pos,
      inputTxsInclusionProofs: exitData.input_txs_inclusion_proofs,
      inFlightTxSigs: exitData.in_flight_tx_sigs,
      txOptions: txOptions
    });
    printEtherscanLink(receipt.transactionHash);
    return receipt;
  } else if (options["piggybackIFEOnOutput"]) {
    const receipt = await rootChain.piggybackInFlightExitOnOutput({
      inFlightTx: options["piggybackIFEOnOutput"],
      outputIndex: options["outputIndex"],
      txOptions: aliceTxOptions
    });
    printEtherscanLink(receipt.transactionHash);
    return receipt;
  } else if (options["piggybackIFEOnInput"]) {
    const receipt = await rootChain.piggybackInFlightExitOnInput({
      inFlightTx: options["piggybackIFEOnInput"],
      inputIndex: options["inputIndex"],
      txOptions: aliceTxOptions
    });
    printEtherscanLink(receipt.transactionHash);
    return receipt;
  } else if (options["getIFEId"]) {
    const exitId = await rootChain.getInFlightExitId({
      txBytes: options["getIFEId"]
    });
    console.log("Exit id: ", exitId);
    return exitId;
  } else if (options["challengeIFEInputSpent"]) {
    /*
    const challengeData = await childChain.inFlightExitGetInputChallengeData(options["challengeIFEInputSpent"], 0)

    const receipt = await rootChain.challengeInFlightExitInputSpent({
      inFlightTx: inflightExit.txbytes,
      inFlightTxInputIndex: 0,
      challengingTx: unsignCarolTx,
      challengingTxInputIndex: 0,
      challengingTxWitness: carolTxDecoded.sigs[0],
      inputTx: unsignInput,
      inputUtxoPos: utxoPosOutput,
      txOptions: {
        privateKey: carolAccount.privateKey,
        from: carolAccount.address
      }
    });*/
  } else if (options["challengeIFEOutputSpent"]) {
    /*
    const challengeData = await childChain.inFlightExitGetOutputChallengeData(
      options["challengeIFEOutputSpent"],
      0
    );

    const receipt = await rootChain.challengeInFlightExitOutputSpent({
      inFlightTx: challengeData.in_flight_txbytes,
      inFlightTxInclusionProof: challengeData.in_flight_proof,
      inFlightTxOutputPos: challengeData.in_flight_output_pos,
      challengingTx: challengeData.spending_txbytes,
      challengingTxInputIndex: challengeData.spending_input_index,
      challengingTxWitness: challengeData.spending_sig,
      txOptions: aliceTxOptions
    });
    printEtherscanLink(receipt.transactionHash);
    return receipt;*/
  } else if (options["challengeIFENotCanonical"]) {
    /*
    const competitor = await childChain.inFlightExitGetCompetitor(
      options["challengeIFENotCanonical"]
    );

    const receipt = await rootChain.challengeInFlightExitNotCanonical({
      inputTx: competitor.input_tx,
      inputUtxoPos: competitor.input_utxo_pos,
      inFlightTx: competitor.in_flight_txbytes,
      inFlightTxInputIndex: competitor.in_flight_input_index,
      competingTx: competitor.competing_txbytes,
      competingTxInputIndex: competitor.competing_input_index,
      competingTxPos: competitor.competing_tx_pos,
      competingTxInclusionProof: competitor.competing_proof,
      competingTxWitness: competitor.competing_sig,
      txOptions: aliceTxOptions
    });
    printEtherscanLink(receipt.transactionHash);
    return receipt;
    */
  } else if (options["respondToNonCanonicalChallenge"]) {
    /*
    const proof = await childChain.inFlightExitProveCanonical(
      options["challengeIFENotCanonical"]
    );

    // Bob responds to the challenge
    const receipt = await rootChain.respondToNonCanonicalChallenge({
      inFlightTx: proof.in_flight_txbytes,
      inFlightTxPos: proof.in_flight_tx_pos,
      inFlightTxInclusionProof: proof.in_flight_proof,
      txOptions: aliceTxOptions
    });
    printEtherscanLink(receipt.transactionHash);
    return receipt;
    */
  } else if (options["deleteNonPiggybackedIFE"]) {
    const exitId = await rootChain.getInFlightExitId({
      txBytes: options["deleteNonPiggybackedIFE"]
    });

    console.log("Exit id: ", exitId);
    const receipt = await rootChain.deleteNonPiggybackedInFlightExit({
      exitId,
      txOptions: txOptions
    });

    console.log(`IFE successfully deleted`);
    printEtherscanLink(receipt.transactionHash);
  } else if (options["processExits"]) {
    const receipt = await rootChain.processExits({
      token: options["processExits"],
      exitId: 0,
      maxExitsToProcess: 20,
      txOptions: txOptions
    });

    console.log(`Exits for queue ${options["processExits"]} processed`);
    printEtherscanLink(receipt.transactionHash);
    return receipt;
  } else if (options["addExitQueue"]) {
    const hasToken = await rootChain.hasToken(options["addExitQueue"]);
    if (!hasToken) {
      console.log(`Adding exit queue for ${options["addExitQueue"]}`);
      const receipt = await rootChain.addToken({
        token: options["addExitQueue"],
        txOptions: aliceTxOptions
      });
      printEtherscanLink(receipt.transactionHash);
      return receipt;
    } else {
      console.log(
        `Exit Queue for ${options["addExitQueue"]} has already been added`
      );
    }
  } else if (options["getExitQueue"]) {
    const queue = await rootChain.getExitQueue(options["getExitQueue"]);
    printObject("", queue);
    return queue;
  } else if (options["getByzantineEvents"]) {
    const response = await childChain.status();

    if (response["byzantine_events"].length) {
      printObject("Byzantine events", response["byzantine_events"]);
    } else {
      console.log("No Byzantine events");
    }

    return response;
  } else if (options["getIFEs"]) {
    const response = await childChain.status();

    if (response["in_flight_exits"].length) {
      printObject("IFEs:", response["in_flight_exits"]);
    } else {
      console.log("No IFEs");
    }

    return response;
  } else if (options["autoChallenge"]) {
    console.log("---> Watching for Byzantine events <---");
    let processedEvents: String[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await childChain.status();

      for (const event of response["byzantine_events"]) {
        if (
          event.details.utxo_pos &&
          event.event === "invalid_exit" &&
          !processedEvents.includes(event.details.utxo_pos)
        ) {
          console.log("---");
          console.log(
            `Found Invalid SE exit for ${event.details.utxo_pos}. Challenge coming up.`
          );
          const challengeData = await childChain.getChallengeData(
            event.details.utxo_pos
          );

          const receipt = await rootChain.challengeStandardExit({
            standardExitId: challengeData.exit_id,
            exitingTx: challengeData.exiting_tx,
            challengeTx: challengeData.txbytes,
            inputIndex: challengeData.input_index,
            challengeTxSig: challengeData.sig,
            txOptions: txOptions
          });

          processedEvents.push(event.details.utxo_pos);

          console.log(`Challenge SE successful`);
          printEtherscanLink(receipt.transactionHash);
          console.log("---");
        }
      }
      sleep.sleep(60);
    }
  } else {
    const usage = commandLineUsage(optionDefs["optionDefinitions"]);
    console.log(usage);
    return;
  }
}

function printObject(message: String, o: any) {
  console.log(`${message}\n ${JSON.stringify(o, undefined, 2)}`);
}

function printEtherscanLink(hash: string) {
  console.log(`TX on Etherscan: https://ropsten.etherscan.io/tx/${hash}`);
}

function printOMGBlockExplorerLink(hash: string) {
  console.log(
    `TX on OMG Network: ${config.block_explorer_url}transaction/${hash}`
  );
}

omgJSMain(options);

module.exports = { omgJSMain, config, web3 };
