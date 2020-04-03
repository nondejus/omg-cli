// eslint-disable-next-line no-unused-vars
import { OMGCLI } from "./omgcli";

export class TestHelper {
  omgcli: OMGCLI;
  processingUTXOPos: string[];

  constructor(_omgli: OMGCLI) {
    this.omgcli = _omgli;
    this.processingUTXOPos = [];
  }

  async getUnspentUTXO(
    owner: String,
    currency: String,
    onlyPlasmaTx: Boolean = false
  ) {
    const ret = await this.omgcli.getUTXOs(owner);
    const amount = await this.omgcli.getFee(currency);

    for (const utxo of ret) {
      if (!this.processingUTXOPos.includes(utxo.utxo_pos)) {
        if ((onlyPlasmaTx && utxo.creating_txhash !== null) || !onlyPlasmaTx) {
          this.processingUTXOPos.push(utxo.utxo_pos);
          if (currency) {
            if (utxo.currency == currency && utxo.amount > amount) {
              return utxo;
            }
          } else {
            return utxo;
          }
        }
      }
    }
    throw "No unspent UTXO found. Aborting test run.";
  }
}
