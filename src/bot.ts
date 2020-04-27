// eslint-disable-next-line no-unused-vars
import { OMGCLI } from "./omgcli";
// eslint-disable-next-line no-unused-vars
import { ChallengeSuccess } from "./interface";
import { Util } from "./util";

const sleep = require("sleep");

export class Bot {
  omgcli: OMGCLI;
  challengedEvents: ChallengeSuccess[];
  ignoredEventValues: string[];

  constructor(_omgli: OMGCLI) {
    this.omgcli = _omgli;
    this.challengedEvents = [];
    this.ignoredEventValues = [
      "0xf8d401f842a000000000000000000000000000000000000000000000000000006c3ad8ba7001a000000000000000000000000000000000000000000000000000006d23ad5f8000f86bf501f39448731f77ef0f0abb324dcbc1768bc75510ab47cf940000000000000000000000000000000000000000880162f39d9b825ffff401f29448731f77ef0f0abb324dcbc1768bc75510ab47cf940000000000000000000000000000000000000000870246139ca7fffc80a00000000000000000000000000000000000000000000000000000000000001337",
    ];
  }

  isEventChallenged(utxo_pos: number): boolean {
    for (const event of this.challengedEvents) {
      if (event.utxo_pos === utxo_pos) {
        return true;
      }
    }
    return false;
  }

  isIgnored(event: any): boolean {
    for (const ignoredEventValue of this.ignoredEventValues) {
      if (ignoredEventValue === String(event.details.txbytes)) {
        return false;
      }
    }
    return true;
  }

  async challenge(status: any): Promise<ChallengeSuccess[]> {
    let rets = [];

    for (const event of status["byzantine_events"]) {
      if (this.isIgnored(event)) {
        if (
          event.event === "invalid_exit" &&
          !this.isEventChallenged(Number(event.details.utxo_pos))
        ) {
          const challengeData = await this.omgcli.getSEChallengeData(
            event.details.utxo_pos
          );
          const receipt = await this.omgcli.challengeSE(challengeData);

          const ret: ChallengeSuccess = {
            utxo_pos: event.details.utxo_pos,
            event_name: "invalid_exit",
            tx_hash: receipt.transactionHash,
          };

          rets.push(ret);
        } else if (event.event === "invalid_piggyback") {
          const outputIndexes: number[] = event.details.outputs;
          if (outputIndexes.length) {
            for (const outputIndex of outputIndexes) {
              console.log(`outputIndex ${outputIndex}`);
              console.log(`outputs ${event.details.outputs}`);
              const outputSpentData = await this.omgcli.getChallengeIFEOutputSpentData(
                event.details.txbytes,
                outputIndex
              );
              const receipt = await this.omgcli.challengeIFEOutputSpent(
                outputSpentData
              );

              const ret: ChallengeSuccess = {
                utxo_pos: 0,
                event_name: "invalid_piggyback",
                tx_hash: receipt.transactionHash,
              };

              rets.push(ret);
            }
          }
        }
      }
    }

    this.challengedEvents = this.challengedEvents.concat(rets);
    return rets;
  }

  async run(expectedResults: number = 0) {
    // eslint-disable-next-line no-constant-condition
    let resultsTotal: ChallengeSuccess[] = [];
    while (true) {
      const status = await this.omgcli.getStatus();
      const receivingResults = await this.challenge(status);
      resultsTotal = resultsTotal.concat(receivingResults);
      if (expectedResults === 0) {
        for (let x = 1; x <= receivingResults.length; x++) {
          console.log(`${x}. challenge successful`);
          Util.printObject(receivingResults[x - 1]);
        }
      } else {
        if (resultsTotal.length === expectedResults) {
          return resultsTotal;
        }
      }

      sleep.sleep(20);
    }
  }
}
