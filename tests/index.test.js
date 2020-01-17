const fs = require("fs");
const { omgJSMain, config } = require("../src/index");
jest.setTimeout(200000);

test("Decode a tx correctly and print it", () => {
  console.log = jest.fn();
  const cliOptions = {
    decode:
      "0xf85a01c0f5f401f294d42b31665b93c128541c8b89a0e545afb08b7dd894000000000000000000000000000000000000000087038d7ea4c6800080a00000000000000000000000000000000000000000000000000000000000000000"
  };

  const output = fs.readFileSync("./tests/fixtures/decodedTx.txt").toString();
  omgJSMain(cliOptions);

  expect(console.log).toHaveBeenCalledWith(output);
});

test("Get the Min Exit Period from the PlasmaFramework", async () => {
  console.log = jest.fn();
  const cliOptions = {
    getExitPeriod: true
  };

  await omgJSMain(cliOptions);

  const ret = console.log.mock.calls[0][0];
  expect(Number(ret)).toBeGreaterThan(0);
});

test("Get UTXOs for an address", async () => {
  console.log = jest.fn();
  const cliOptions = {
    getUTXOs: config.alice_eth_address
  };

  await omgJSMain(cliOptions);
  const ret = console.log.mock.calls[0][0];
  expect(JSON.parse(ret)).toBeInstanceOf(Array);
});

test("RLP encoded a tx from a JSON file", async () => {
  console.log = jest.fn();

  const cliOptions = {
    encode: "./tests/fixtures/tx1.json"
  };

  await omgJSMain(cliOptions);
  const ret = console.log.mock.calls[0][0];
  expect(ret).toBe(
    "0xf87480e1a000000000000000000000000000000000000000000000000000001a6016b2d000eeed01eb94d42b31665b93c128541c8b89a0e545afb08b7dd89400000000000000000000000000000000000000000180a00000000000000000000000000000000000000000000000000000000000000000"
  );
});

test("Deposit some ETH from Alice's address", async () => {
  const cliOptions = {
    deposit: "0x0000000000000000000000000000000000000000"
  };

  const fNameLog = "./tests/logs/ETH-deposit-tx-receipt.json";

  if (fs.existsSync(fNameLog)) {
    fs.unlinkSync(fNameLog);
  }

  const ret = await omgJSMain(cliOptions);
  fs.writeFileSync(fNameLog, JSON.stringify(ret, undefined, 2));
  expect(ret.transactionHash.length).toBeGreaterThan(0);
});

test("Transaction on Plasma network sent from Alice", async () => {
  const utxo = await getUnspentUTXO(config.alice_eth_address);

  // Get a tx template
  const txRaw = fs.readFileSync("./tests/fixtures/tx2.json");
  const tx = JSON.parse(txRaw);

  // Replace values with retrieved UTXO values
  tx.inputs[0].blknum = utxo.blknum;
  tx.outputs[0].outputGuard = utxo.owner;

  // Write the JSON back into a file
  const fNameLog = "./tests/logs/plasma-tx.json";
  fs.writeFileSync(fNameLog, JSON.stringify(tx, undefined, 2));

  const cliOptions2 = {
    transaction: fNameLog
  };

  // Call cli with the transaction option
  const ret2 = await omgJSMain(cliOptions2);
  expect(ret2.blknum).toBeGreaterThan(utxo.blknum);
});

test("Get SE data for an unspent UTXO of Alice", async () => {
  const utxo = await getUnspentUTXO(config.alice_eth_address);

  const cliOptions = {
    getSEData: utxo.utxo_pos
  };

  const ret = await omgJSMain(cliOptions);
  expect(ret.proof.length).toBeGreaterThan(0);
});

test("Start SE for an unspent UTXO of Alice", async () => {
  const utxo = await getUnspentUTXO(config.alice_eth_address);

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
  expect(ret2.transactionHash.length).toBeGreaterThan(0);
});

async function getUnspentUTXO(address) {
  console.log = jest.fn();
  const cliOptions1 = {
    getUTXOs: address
  };

  await omgJSMain(cliOptions1);
  const ret1 = console.log.mock.calls[0][0];

  return JSON.parse(ret1)[0];
}
