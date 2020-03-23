import { OMGCLI } from "../src/omgcli";
const { transaction } = require("@omisego/omg-js-util/src");
const config = require("../config.js");
const awaitTransactionMined = require("await-transaction-mined");
const POLL_INTERVAL = 5000;

jest.setTimeout(200000);

const bobTxOptions = {
  privateKey: config.bob_eth_address_private_key,
  from: config.bob_eth_address,
  gas: 6000000,
  gasPrice: "8000000000"
};

let omgcli: OMGCLI;
//let processingUTXOPos: number[] = [];

beforeEach(() => {
  omgcli = new OMGCLI(config);
  // processingUTXOPos = [];
});

test("Get UTXOs for an address", async () => {
  const response = await omgcli.getUTXOs(config.alice_eth_address);

  expect(response).toBeInstanceOf(Array);
});

test("Get the Min Exit Period from the PlasmaFramework", async () => {
  const response = await omgcli.getExitPeriod();

  expect(Number(response)).toBeGreaterThan(0);
});

test("Get events", async () => {
  const response = await omgcli.getStatus();
  expect(response.byzantine_events).toBeInstanceOf(Array);
});

test("Get exit queue for ETH", async () => {
  const response = await omgcli.getExitQueue(
    "0x0000000000000000000000000000000000000000"
  );
  expect(response).toBeInstanceOf(Array);
});

test("Get fees", async () => {
  const response = await omgcli.getFees();
  expect(response).toBeInstanceOf(Object);
});

test.only("Process exits for ETH", async () => {
  try {
    const receiptAddToken = await omgcli.addToken(
      "0x0000000000000000000000000000000000000000"
    );
  } catch (err) {}

  let receiptProcessExits;
  let error;
  try {
    omgcli.txOptions = bobTxOptions;

    receiptProcessExits = await omgcli.processExits(
      "0x0000000000000000000000000000000000000000"
    );
  } catch (err) {
    error = err;
  }

  if (error) {
    expect(error.toString()).toContain(
      "Transaction has been reverted by the EVM"
    );
  } else {
    expect(receiptProcessExits.transactionHash.length).toBeGreaterThan(0);
  }
});
