/* eslint-disable no-undef */
const fs = require("fs");
import { OMGCLI } from "../src/omgcli";

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






*/
