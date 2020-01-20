const { transaction } = require("@omisego/omg-js-util/src");
const ChildChain = require("@omisego/omg-js-childchain/src/childchain");
const RootChain = require("@omisego/omg-js-rootchain/src/rootchain");
const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");

const fs = require("fs");
const BigNumber = require("bignumber.js");
const BN = require("bn.js");

const config = require("../config.js");
const optionDefs = require("./options");

const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url));

const aliceTxOptions = {
  privateKey: config.alice_eth_address_private_key,
  from: config.alice_eth_address,
  gas: 6000000
};

const bobTxOptions = {
  privateKey: config.bob_eth_address_private_key,
  from: config.bob_eth_address,
  gas: 6000000
};

const childChain = new ChildChain({
  watcherUrl: config.watcher_url,
  watcherProxyUrl: config.watcher_proxy_url
});

const rootChain = new RootChain({
  web3,
  plasmaContractAddress: config.rootchain_plasma_contract_address
});

const options = commandLineArgs(
  optionDefs["optionDefinitions"][1]["optionList"]
);

async function omgJSMain(options: any) {
  //console.log(JSON.stringify(options, undefined, 2));

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
    const encodedTx = transaction.encode(tx);
    console.log(encodedTx);
  } else if (options["deposit"]) {
    let amount;

    if (options["deposit"] == "0x0000000000000000000000000000000000000000") {
      if (!options["amount"]) {
        amount = new BigNumber(
          web3.utils.toWei(config.alice_eth_deposit_amount, "ether")
        );
      } else {
        amount = options["amount"];
      }
      const depositTx = await transaction.encodeDeposit(
        config.alice_eth_address,
        amount,
        options["deposit"]
      );
      console.log(
        `Depositing ${web3.utils.fromWei(
          amount.toString(),
          "ether"
        )} ETH for Alice from the rootchain to the childchain`
      );
      const receipt = await rootChain.depositEth({
        depositTx,
        amount: amount,
        txOptions: aliceTxOptions
      });
      console.log("ETH deposit successful");
      printEtherscanLink(receipt.transactionHash);
      console.log("Funds can be spent after cool down of 10 ETH blocks");
      return receipt;
    } else {
      if (!options["amount"]) {
        amount = config.alice_erc20_deposit_amount;
      } else {
        amount = options["amount"];
      }
      const depositTx = await transaction.encodeDeposit(
        config.alice_eth_address,
        amount,
        options["deposit"]
      );
      console.log(
        `Approving ERC20 token ${options["deposit"]} for deposit from Alice`
      );
      const receipt1 = await rootChain.approveToken({
        erc20Address: config.erc20_contract,
        amount: amount,
        txOptions: aliceTxOptions
      });
      console.log("ERC20 approved: ", receipt1.transactionHash);

      console.log(
        `Depositing ${config.alice_erc20_deposit_amount} ERC20 from the rootchain to the childchain`
      );
      const receipt2 = await rootChain.depositToken({
        depositTx,
        txOptions: aliceTxOptions
      });
      console.log("Token deposit successful");
      printEtherscanLink(receipt2.transactionHash);
      return receipt2;
    }
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
    printObject("Signed Tx", signedTxn);

    let receipt = await childChain.submitTransaction(signedTxn);
    printObject("Tx receipt", receipt);
    printOMGBlockExplorerLink(receipt.txhash);
    return receipt;
  } else if (options["getSEData"]) {
    const utxo = transaction.decodeUtxoPos(options["getSEData"]);
    const exitData = await childChain.getExitData(utxo);
    printObject("SE Data", exitData);
    return exitData;
  } else if (options["startSE"]) {
    const exitDataRaw = fs.readFileSync(options["startSE"]);
    const exitData = JSON.parse(exitDataRaw);

    const receipt = await rootChain.startStandardExit({
      utxoPos: exitData.utxo_pos,
      outputTx: exitData.txbytes,
      inclusionProof: exitData.proof,
      txOptions: aliceTxOptions
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
      txOptions: bobTxOptions
    });

    printEtherscanLink(receipt.transactionHash);
    return receipt;
  } else if (options["getIFEData"]) {
    const txRaw = fs.readFileSync(options["getIFEData"]);
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
      txOptions: aliceTxOptions
    });
    printEtherscanLink(receipt.transactionHash);
    return receipt;
  } else if (options["processExits"]) {
    const receipt = await rootChain.processExits({
      token: options["processExits"],
      exitId: 0,
      maxExitsToProcess: 20,
      txOptions: aliceTxOptions
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
  } else if (options["getEvents"]) {
    const response = await childChain.status();

    if (response["byzantine_events"].length) {
      printObject("Byzantine events", response["byzantine_events"]);
    } else {
      console.log("No Byzantine events");
    }

    return response;
  } else {
    const usage = commandLineUsage(optionDefs["optionDefinitions"]);
    console.log(usage);
    return;
  }
}

function printObject(message: String, o: any) {
  console.log(`${message}\n ${JSON.stringify(o, undefined, 2)}`);
}

async function printEtherscanLink(hash: string) {
  console.log(`TX on Etherscan: https://ropsten.etherscan.io/tx/${hash}`);
}

async function printOMGBlockExplorerLink(hash: string) {
  console.log(
    `TX on OMG Network: ${config.block_explorer_url}transaction/${hash}`
  );
}

omgJSMain(options);

module.exports = { omgJSMain, config };
