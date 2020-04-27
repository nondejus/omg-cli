import { OMGCLI } from "../../src/omgcli";
import { TestHelper } from "../../src/test_helper";
import { Bot } from "../../src/bot";
import { Util } from "../../src/util";
const { transaction } = require("@omisego/omg-js-util/src");
const config = require("../../config.js");

jest.setTimeout(3000000);

const omgcli: OMGCLI = new OMGCLI(config);
const testHelder: TestHelper = new TestHelper(omgcli);

test("Spend UTXO on plasma and root chain and then auto challenge the invalid exit", async () => {
  const utxos = await testHelder.getUnspentUTXOs(
    omgcli.txOptions.from,
    transaction.ETH_CURRENCY,
    true
  );

  if (utxos.length) {
    // Start SE
    const SEData = await omgcli.getSEData(utxos[0].utxo_pos);
    const receiptSE = await omgcli.startSE(SEData);
    expect(receiptSE.transactionHash.length).toBeGreaterThan(0);

    // Double spend the same utxo on the plasma chain
    const tx = await omgcli.generateTx(omgcli.txOptions.from, [
      utxos[0].utxo_pos,
    ]);
    const receiptTx = await omgcli.sendDecodedTx(tx);

    expect(receiptTx).toHaveProperty("blknum");
    expect(receiptTx).toHaveProperty("txhash");
    expect(receiptTx).toHaveProperty("txindex");

    // Challenge the double spend once it is detected
    const bot = new Bot(omgcli);
    const result = await bot.run(1);

    expect(result[0].event_name).toBe("invalid_exit");
  } else {
    console.log(`Skip test because there are no UTXOs available`);
  }
});
