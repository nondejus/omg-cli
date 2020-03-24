import { OMGCLI } from "../src/omgcli";
const { transaction } = require("@omisego/omg-js-util/src");
const config = require("../config.js");
const BN = require("bn.js");

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

test.only("Get UTXOs for an address", async () => {
  const response = await omgcli.getUTXOs(config.alice_eth_address);

  if (response.length) {
    const utxo = response[0];
    expect(utxo).toHaveProperty("amount");
    expect(utxo).toHaveProperty("currency");
    expect(utxo).toHaveProperty("oindex");
    expect(utxo).toHaveProperty("txindex");
    expect(utxo).toHaveProperty("utxo_pos");
    expect(utxo).toHaveProperty("owner");
  }
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
  const response = await omgcli.getExitQueue(transaction.ETH_CURRENCY);
  expect(response).toBeInstanceOf(Array);
});

test.only("Get fees", async () => {
  const response = await omgcli.getFees();
  const firstFeeEntry = response["1"][0];

  expect(firstFeeEntry).toHaveProperty("amount");
  expect(firstFeeEntry).toHaveProperty("currency");
  expect(firstFeeEntry).toHaveProperty("subunit_to_unit");
});

test("Process exits for ETH", async () => {
  try {
    await omgcli.addToken(transaction.ETH_CURRENCY);
  } catch (err) {
    console.log(
      `Adding the ETH token failed. Likely this is because it has been added already.`
    );
  }

  let receiptProcessExits;
  let error;
  try {
    omgcli.txOptions = bobTxOptions;

    receiptProcessExits = await omgcli.processExits(transaction.ETH_CURRENCY);
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
