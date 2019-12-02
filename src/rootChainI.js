const RootChain = require("omg-js/packages/omg-js-rootchain/src/rootchain");
const config = require("../config.js");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url));

const rootChain = new RootChain({
  web3,
  plasmaContractAddress: config.rootchain_plasma_contract_address
});

async function startStandardExit(exitData) {
  return await rootChain.startStandardExit({
    outputId: exitData.utxo_pos,
    outputTx: exitData.txbytes,
    inclusionProof: exitData.proof,
    txOptions: {
      privateKey: config.alice_eth_address_private_key,
      from: config.alice_eth_address
    }
  });
}

async function challengeStandardExit(challangeData) {
  return await rootChain.challengeStandardExit({
    standardExitId: challengeData.exit_id,
    exitingTx: challengeData.exiting_tx,
    challengeTx: challengeData.txbytes,
    inputIndex: challengeData.input_index,
    challengeTxSig: challengeData.sig,
    txOptions: {
      privateKey: config.alice_eth_address_private_key,
      from: config.alice_eth_address
    }
  });
}

async function startIFE(startIFEData) {
  return await rootChain.startInFlightExit({
    inFlightTx: exitData.in_flight_tx,
    inputTxs: exitData.input_txs,
    inputUtxosPos: exitData.input_utxos_pos,
    outputGuardPreimagesForInputs: ["0x"],
    inputTxsInclusionProofs: exitData.input_txs_inclusion_proofs,
    inFlightTxSigs: decodedTx.sigs,
    signatures: exitData.in_flight_tx_sigs,
    inputSpendingConditionOptionalArgs: ["0x"],
    txOptions: {
      privateKey: config.alice_eth_address_private_key,
      from: config.alice_eth_address
    }
  });
}

async function processExits(currency) {
  return await rootChain.processExits({
    token: currency,
    exitId: 0,
    maxExitsToProcess: 20,
    txOptions: {
      privateKey: config.alice_eth_address_private_key,
      from: config.alice_eth_address
    }
  });
}

async function getTimeToExit() {
  const minExitPeriod = await rootChain.plasmaContract.methods
    .minExitPeriod()
    .call();
  return Number(minExitPeriod);
}

module.exports = {
  startStandardExit,
  getTimeToExit,
  challengeStandardExit,
  startIFE,
  processExits
};
