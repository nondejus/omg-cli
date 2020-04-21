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
    plasmaSpendable: Boolean = false
  ) {
    const infoUTXOs = await this.omgcli.getUTXOs(owner);
    const securityUTXOs = await this.omgcli.getExitableUTXOs(owner);
    const amount = await this.omgcli.getFee(currency);

    for (const utxo of infoUTXOs) {
      if (!this.processingUTXOPos.includes(utxo.utxo_pos.toString())) {
        if (this.utxoExists(securityUTXOs, utxo.utxo_pos))
          if (plasmaSpendable && utxo.creating_txhash !== null) {
            if (utxo.currency === currency) {
              if (utxo.amount > amount) {
                this.processingUTXOPos.push(utxo.utxo_pos);
                return utxo;
              }
            }
          } else {
            if (utxo.currency == currency) {
              return utxo;
            }
          }
      }
    }
    throw "No unspent UTXO found. Aborting test run.";
  }

  utxoExists(utxos: any, utxoPos: Number): boolean {
    let found: boolean = false;
    for (const utxo of utxos) {
      if (Number(utxo.utxo_pos) === utxoPos) {
        found = true;
      }
    }
    return found;
  }
}
