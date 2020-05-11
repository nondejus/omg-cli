import { OMGCLI } from "../src/omgcli";
import { TestHelper } from "../src/test_helper";
const { transaction } = require("@omisego/omg-js-util/src");
const config = require("../config.js");

jest.setTimeout(200000);

let omgcli: OMGCLI = new OMGCLI(config);
const testHelper: TestHelper = new TestHelper(omgcli);

/*
 * General functions
 */

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

test("Get fees", async () => {
  const response = await omgcli.getFees();
  const firstFeeEntry = response["1"][0];

  expect(firstFeeEntry).toHaveProperty("amount");
  expect(firstFeeEntry).toHaveProperty("currency");
  expect(firstFeeEntry).toHaveProperty("subunit_to_unit");
});

test(`Deposit some ETH`, async () => {
  const receipts = await omgcli.deposit(transaction.ETH_CURRENCY, 100);
  expect(receipts.depositReceipt.transactionHash.length).toBeGreaterThan(0);
});

test(`Deposit some ERC20 tokens`, async () => {
  const receipts = await omgcli.deposit(config.erc20_contract, 100);
  expect(receipts.depositReceipt.transactionHash.length).toBeGreaterThan(0);
});

test("Process exits for ETH", async () => {
  const queue = await omgcli.getExitQueue(transaction.ETH_CURRENCY);

  if (queue.length) {
    const receiptProcessExits = await omgcli.processExits(
      transaction.ETH_CURRENCY
    );
    expect(receiptProcessExits.transactionHash.length).toBeGreaterThan(0);
  } else {
    console.log(`Skipping test as the queue is empty`);
  }
});

test("Get UTXOs for an address", async () => {
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

test("Get exitable UTXOs for an address", async () => {
  const response = await omgcli.getExitableUTXOs(config.alice_eth_address);

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

test("Get balance for an address", async () => {
  const response = await omgcli.getBalance(config.alice_eth_address);

  if (response.length) {
    const utxo = response[0];
    expect(utxo).toHaveProperty("amount");
    expect(utxo).toHaveProperty("currency");
  } else {
    console.log(`Skipping test as there is no balance for the account`);
  }
});

test("Generate tx from two utxo", async () => {
  const utxos = await testHelper.getUnspentUTXOs(
    omgcli.txOptions.from,
    transaction.ETH_CURRENCY,
    true
  );

  const tx = await omgcli.generateTx(omgcli.txOptions.from, [
    utxos[0].utxo_pos,
    utxos[1].utxo_pos,
  ]);
  expect(tx.inputs.length).toBe(2);
  expect(tx.outputs.length).toBe(2);
  expect(tx).toHaveProperty("transactionType");
  expect(tx).toHaveProperty("inputs");
  expect(tx).toHaveProperty("outputs");
  expect(tx).toHaveProperty("metadata");
});

test("Send a tx on the plasma chain", async () => {
  const utxos = await testHelper.getUnspentUTXOs(
    omgcli.txOptions.from,
    transaction.ETH_CURRENCY,
    true
  );

  const tx = await omgcli.generateTx(omgcli.txOptions.from, [
    utxos[0].utxo_pos,
  ]);

  const receiptTx = await omgcli.sendDecodedTx(tx);
  expect(receiptTx).toHaveProperty("blknum");
  expect(receiptTx).toHaveProperty("txhash");
  expect(receiptTx).toHaveProperty("txindex");
});

/*
 * SE functions
 */
test("Get SE data for an unspent UTXO", async () => {
  const utxos = await testHelper.getUnspentUTXOs(
    omgcli.txOptions.from,
    transaction.ETH_CURRENCY
  );

  const SEData = await omgcli.getSEData(utxos[0].utxo_pos);
  expect(SEData).toHaveProperty("proof");
  expect(SEData).toHaveProperty("txbytes");
  expect(SEData).toHaveProperty("utxo_pos");
});

test("Challenge SE for an inactive exit should fail", async () => {
  const utxos = await testHelper.getUnspentUTXOs(
    omgcli.txOptions.from,
    transaction.ETH_CURRENCY
  );

  try {
    await omgcli.getSEChallengeData(utxos[0].utxo_pos);
  } catch (err) {
    expect(err).toEqual(
      new Error(
        "The challenge of particular exit is impossible because exit is inactive or missing"
      )
    );
  }
});

/*
 * IFE functions
 */
test("Get IFE data for an unspent UTXO", async () => {
  const utxos = await testHelper.getUnspentUTXOs(
    omgcli.txOptions.from,
    transaction.ETH_CURRENCY,
    true
  );

  const tx = await omgcli.getTransaction(utxos[0].creating_txhash);
  const IFEData = await omgcli.getIFEData(tx);
  expect(IFEData).toHaveProperty("in_flight_tx");
  expect(IFEData).toHaveProperty("in_flight_tx_sigs");
  expect(IFEData).toHaveProperty("input_txs");
  expect(IFEData).toHaveProperty("input_txs_inclusion_proofs");
  expect(IFEData).toHaveProperty("input_utxos_pos");
});
