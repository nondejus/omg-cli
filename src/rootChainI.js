const RootChain = require("omg-js/packages/omg-js-rootchain/src/rootchain");
const config = require("../config.js");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.geth_url));
const rootChain = new RootChain(web3, config.rootchain_plasma_contract_address);

async function startStandardExit(exitData) {
  return await rootChain.startStandardExit(
    exitData.utxo_pos,
    exitData.txbytes,
    exitData.proof,
    {
      privateKey: config.alice_eth_address_private_key,
      from: config.alice_eth_address,
      gas: 1000000
    }
  );
}

async function challengeStandardExit(challangeData) {
  return await rootChain.challengeStandardExit(
    challangeData.exit_id,
    challangeData.exiting_tx,
    challangeData.txbytes,
    challangeData.input_index,
    challangeData.sig,
    {
      privateKey: config.alice_eth_address_private_key,
      from: config.alice_eth_address,
      gas: 1000000
    }
  );
}

async function startIFE(startIFEData) {
  return await rootChain.startInFlightExit(
    startIFEData.in_flight_tx,
    startIFEData.input_txs,
    startIFEData.input_utxos_pos,
    ["0x"],
    startIFEData.input_txs_inclusion_proofs,
    startIFEData.in_flight_tx_sigs,
    signatures,
    ["0x"],
    {
      privateKey: config.alice_eth_address_private_key,
      from: config.alice_eth_address,
      gas: 1000000
    }
  );
}

async function processExits(currency) {
  return await rootChain.processExits(currency, 0, 20, {
    privateKey: config.alice_eth_address_private_key,
    from: config.alice_eth_address,
    gas: 1000000
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
