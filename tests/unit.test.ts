/* eslint-disable no-undef */
const fs = require("fs");
import { OMGCLI } from "../src/omgcli";
//const { transaction } = require("@omisego/omg-js-util/src");
//const awaitTransactionMined = require("await-transaction-mined");

const config = require("../config.js");

jest.setTimeout(200000);

let omgcli: OMGCLI;
//let processingUTXOPos: number[] = [];

beforeEach(() => {
  omgcli = new OMGCLI(config);
  // processingUTXOPos = [];
});

test("Decode a tx correctly and print it", () => {
  const encodedTx: String =
    "0xf85a01c0f5f401f294d42b31665b93c128541c8b89a0e545afb08b7dd894000000000000000000000000000000000000000087038d7ea4c6800080a00000000000000000000000000000000000000000000000000000000000000000";

  const raw = fs.readFileSync("./tests/fixtures/decodedTx.txt");
  const expected = JSON.parse(raw).toString();
  const response = omgcli.decode(encodedTx).toString();

  expect(expected).toBe(response);
});

test("RLP encode a tx from a JSON file", async () => {
  const response = omgcli.encode("./tests/fixtures/tx1.json");

  expect(response.tx).toEqual(
    "0xf87480e1a000000000000000000000000000000000000000000000000000001a6016b2d000eeed01eb94d42b31665b93c128541c8b89a0e545afb08b7dd89400000000000000000000000000000000000000000180a00000000000000000000000000000000000000000000000000000000000000000"
  );
  expect(response.signedTx).toEqual(
    "0xf8b9f843b84145b1f3b7d51c7288e45d8824b87015a9b82f1906b802c565fa6c7a30a6c5f8845c4a30d0b3bdc0db76f491d88add0e06c18e1d43d1e97c362a8355fec3b3c8ef1b01e1a000000000000000000000000000000000000000000000000000001a6016b2d000eeed01eb94d42b31665b93c128541c8b89a0e545afb08b7dd89400000000000000000000000000000000000000000180a00000000000000000000000000000000000000000000000000000000000000000"
  );
});
/*

test(`Deposit some ETH from cli params`, async () => {
  const cliOptions = {
    deposit: transaction.ETH_CURRENCY,
    amount: 1
  };

  const depositReceipt = await omgJSMain(cliOptions);
  await awaitTransactionMined.awaitTx(web3, depositReceipt.transactionHash);
  expect(depositReceipt.transactionHash.length).toBeGreaterThan(0);
});

test(`Deposit some ERC20 tokens from cli params`, async () => {
  const cliOptions = {
    deposit: config.erc20_contract,
    setTxOptions: "./tx/txOptions-bob.json"
  };

  const depositReceipt = await omgJSMain(cliOptions);
  await awaitTransactionMined.awaitTx(web3, depositReceipt.transactionHash);
  expect(depositReceipt.transactionHash.length).toBeGreaterThan(0);
});

test("Send a tx on the plasma chain", async () => {
  const utxo = await getUnspentUTXO(
    config.alice_eth_address,
    transaction.ETH_CURRENCY
  );

  // Get a tx template
  const txRaw = fs.readFileSync("./tests/fixtures/tx2.json");
  const tx = JSON.parse(txRaw);

  // Replace values with retrieved UTXO values
  tx.inputs[0].blknum = utxo.blknum;
  tx.inputs[0].txindex = utxo.txindex;
  tx.inputs[0].oindex = utxo.oindex;
  tx.outputs[0].outputGuard = utxo.owner;
  tx.outputs[0].currency = utxo.currency;
  tx.outputs[0].amount = parseInt(utxo.amount);

  // Write the JSON back into a file
  const fNameLog = "./tests/logs/plasma-tx.json";
  fs.writeFileSync(fNameLog, JSON.stringify(tx, undefined, 2));

  const cliOptions = {
    transaction: fNameLog
  };

  // Call cli with the transaction option
  const ret = await omgJSMain(cliOptions);
  expect(ret.blknum).toBeGreaterThan(utxo.blknum);
});

test("Get SE data for an unspent UTXO", async () => {
  const utxo = await getUnspentUTXO(
    config.alice_eth_address,
    transaction.ETH_CURRENCY
  );
  const cliOptions = {
    getSEData: utxo.utxo_pos
  };

  const ret = await omgJSMain(cliOptions);
  expect(ret.proof.length).toBeGreaterThan(0);
});

test("Start SE for an unspent UTXO", async () => {
  const utxo = await getUnspentUTXO(
    config.alice_eth_address,
    transaction.ETH_CURRENCY
  );

  const cliOptions1 = {
    getSEData: utxo.utxo_pos
  };

  const ret1 = await omgJSMain(cliOptions1);
  const fNameLog = "./tests/logs/startSE.json";
  fs.writeFileSync(fNameLog, JSON.stringify(ret1, undefined, 2));

  const cliOptions2 = {
    startSE: fNameLog
  };

  const ret2 = await omgJSMain(cliOptions2);
  await awaitTransactionMined.awaitTx(web3, ret2.transactionHash);
  expect(ret2.transactionHash.length).toBeGreaterThan(0);
});

test("Process exits for ETH", async () => {
  const cliOptions = {
    processExits: transaction.ETH_CURRENCY
  };

  const processReceipt = await omgJSMain(cliOptions);
  await awaitTransactionMined.awaitTx(web3, processReceipt.transactionHash);
  expect(processReceipt.transactionHash.length).toBeGreaterThan(0);
});

test("Get events", async () => {
  console.log = jest.fn();
  const cliOptions = {
    getEvents: true
  };
  await omgJSMain(cliOptions);
  const ret = console.log.mock.calls[0][0];

  expect(ret).toContain("Byzantine");
});

async function getUnspentUTXO(owner, currency) {
  console.log = jest.fn();
  const cliOptions1 = {
    getUTXOs: owner
  };

  await omgJSMain(cliOptions1);
  const ret = JSON.parse(console.log.mock.calls[0][0]);

  for (const utxo of ret) {
    if (!processingUTXOPos.includes(utxo.utxo_pos)) {
      processingUTXOPos.push(utxo.utxo_pos);
      if (currency) {
        if (utxo.currency == currency) {
          return utxo;
        }
      } else {
        return utxo;
      }
    }
  }
  throw "No unspent UTXO found. Aborting test run.";
}*/
