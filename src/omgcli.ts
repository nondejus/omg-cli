const { transaction } = require("@omisego/omg-js-util/src");
const ChildChain = require("@omisego/omg-js-childchain/src/childchain");
const rpcAPI = require("@omisego/omg-js-childchain/src/rpc/rpcApi");
const RootChain = require("@omisego/omg-js-rootchain/src/rootchain");
const txUtils = require("@omisego/omg-js-rootchain/src/txUtils");

import { Util } from "./util";
import { Load } from "./load";

const fs = require("fs");
const BigNumber = require("bn.js");
const JSONbig = require("json-bigint");
const sleep = require("sleep");
const Web3 = require("web3");

export class OMGCLI {
  childChain: any;
  rootChain: any;
  options: any;
  txOptions: any;
  web3: any;
  config: any;

  constructor(config: any) {
    this.config = config;
    const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node));

    this.childChain = new ChildChain({
      watcherUrl: config.watcher_url,
      watcherProxyUrl: config.watcher_proxy_url
    });
    this.rootChain = new RootChain({
      web3,
      plasmaContractAddress: config.plasmaframework_contract_address
    });
    this.web3 = web3;
  }

  async run(options: any) {
    if (options["setTxOptions"]) {
      const txOptionsRaw = fs.readFileSync(options["setTxOptions"]);
      this.txOptions = JSON.parse(txOptionsRaw);
    } else {
      const aliceTxOptions = {
        privateKey: this.config.alice_eth_address_private_key,
        from: this.config.alice_eth_address
      };
      this.txOptions = aliceTxOptions;
    }
    this.txOptions["gas"] = "6000000";
    this.txOptions["gasPrice"] = "1000000000";

    if (options["decode"]) {
      const decodedTx = transaction.decodeTxBytes(options["decode"]);
      Util.printObject(decodedTx, "RLP decoded tx");
    } else if (options["getUTXOs"]) {
      const utxos = await this.childChain.getUtxos(options["getUTXOs"]);
      Util.printObject(utxos);
    } else if (options["getExitPeriod"]) {
      const minExitPeriod = await this.rootChain.plasmaContract.methods
        .minExitPeriod()
        .call();

      console.log(minExitPeriod);
      return Number(minExitPeriod);
    } else if (options["getFees"]) {
      Util.printObject(await this.getFees());
    } else if (options["encode"]) {
      const txRaw = fs.readFileSync(options["encode"]);
      const tx = JSON.parse(txRaw);
      const typedData = transaction.getTypedData(
        tx,
        this.config.plasmaframework_contract_address
      );

      const privateKeys = new Array(tx.inputs.length).fill(
        this.txOptions.privateKey
      );
      const signatures = this.childChain.signTransaction(
        typedData,
        privateKeys
      );

      const signedTxn = this.childChain.buildSignedTransaction(
        typedData,
        signatures
      );

      console.log(`Signature: ${signatures}`);
      console.log(`Encoded Tx without signature: ${transaction.encode(tx)}`);
      console.log(`Encoded Tx with signature: ${signedTxn}`);
    } else if (options["deposit"]) {
      let amount = options["amount"];

      if (fs.existsSync(options["deposit"])) {
        const txRaw = fs.readFileSync(options["deposit"]);
        const tx = JSON.parse(txRaw);
        const encodedTx = transaction.encode(tx);

        const isEth = tx.outputs[0].currency === transaction.ETH_CURRENCY;
        const { address, contract } = isEth
          ? await this.rootChain.getEthVault()
          : await this.rootChain.getErc20Vault();

        if (!isEth) {
          const approvalReceipt = await this.rootChain.approveToken({
            erc20Address: this.config.erc20_contract,
            amount: this.config.alice_erc20_deposit_amount,
            txOptions: this.txOptions
          });
          console.log("ERC20 approval successful");
          Util.printEtherscanLink(approvalReceipt.transactionHash, this.config);
        }

        const txDetails = {
          from: this.txOptions.from,
          to: address,
          ...(isEth ? { value: amount } : {}),
          data: txUtils.getTxData(this.web3, contract, "deposit", encodedTx),
          gas: this.txOptions.gas
        };
        const depositReceipt = await txUtils.sendTx({
          web3: this.web3,
          txDetails,
          privateKey: this.txOptions.privateKey
        });
        if (isEth) {
          console.log(`ETH deposit from raw tx successful`);
        } else {
          console.log(`Token deposit from raw tx successful`);
        }

        Util.printEtherscanLink(depositReceipt.transactionHash, this.config);
        return depositReceipt;
      } else if (
        options["deposit"] == "0x0000000000000000000000000000000000000000"
      ) {
        if (!options["amount"]) {
          amount = new BigNumber(
            this.web3.utils.toWei(this.config.alice_eth_deposit_amount, "ether")
          );
        }

        console.log(
          `Depositing ${this.web3.utils.fromWei(
            amount.toString(),
            "ether"
          )} ETH from ${
            this.txOptions.from
          } from the rootchain to the childchain`
        );
        const depositReceipt = await this.rootChain.deposit({
          amount: amount,
          currency: options["deposit"],
          txOptions: this.txOptions
        });
        console.log("ETH deposit successful");
        Util.printEtherscanLink(depositReceipt.transactionHash, this.config);
        console.log("Funds can be spent after cool down of 10 ETH blocks");
        return depositReceipt;
      } else {
        if (!options["amount"]) {
          amount = this.config.alice_erc20_deposit_amount;
        }

        const approvalReceipt = await this.rootChain.approveToken({
          erc20Address: options["deposit"],
          amount: new BigNumber(amount),
          txOptions: this.txOptions
        });
        console.log("ERC20 approved: ", approvalReceipt.transactionHash);

        console.log(
          `Depositing ${amount} ERC20 ${options["deposit"]} from the rootchain to the childchain`
        );
        const depositReceipt = await this.rootChain.deposit({
          amount: new BigNumber(amount),
          currency: options["deposit"],
          txOptions: this.txOptions
        });

        console.log("Token deposit successful");
        Util.printEtherscanLink(depositReceipt.transactionHash, this.config);
        return depositReceipt;
      }
    } else if (options["addFeesToTx"]) {
      const createdTx = await this.prepareTx(options["addFeesToTx"]);
      Util.printObject(createdTx.transactions[0]);
      return createdTx.transactions[0];
    } else if (options["sendTx"]) {
      let tx;
      if (fs.existsSync(options["sendTx"])) {
        const txRaw = fs.readFileSync(options["sendTx"]);
        tx = JSONbig.parse(txRaw);
      } else {
        tx = options["sendTx"];
      }

      const typedData = transaction.getTypedData(
        tx,
        this.config.plasmaframework_contract_address
      );

      const privateKeys = new Array(1).fill(this.txOptions.privateKey);
      const signatures = this.childChain.signTransaction(
        typedData,
        privateKeys
      );

      const signedTxn = this.childChain.buildSignedTransaction(
        typedData,
        signatures
      );
      Util.printObject("Signed Tx", signedTxn);

      let receipt = await this.childChain.submitTransaction(signedTxn);
      Util.printObject("Tx receipt", receipt);
      Util.printOMGBlockExplorerLink(receipt.txhash, this.config);
      return receipt;
    } else if (options["getSEData"]) {
      const utxo = transaction.decodeUtxoPos(options["getSEData"]);
      const exitData = await this.childChain.getExitData(utxo);
      Util.printObject(exitData);
      return exitData;
    } else if (options["getBalance"]) {
      const balance = await this.childChain.getBalance(options["getBalance"]);
      Util.printObject(balance);
      return balance;
    } else if (options["startSE"]) {
      const exitDataRaw = fs.readFileSync(options["startSE"]);
      const exitData = JSONbig.parse(exitDataRaw);

      const receipt = await this.rootChain.startStandardExit({
        utxoPos: exitData.utxo_pos,
        outputTx: exitData.txbytes,
        inclusionProof: exitData.proof,
        txOptions: this.txOptions
      });

      Util.printEtherscanLink(receipt.transactionHash, this.config);
      return receipt;
    } else if (options["getSEChallengeData"]) {
      const utxoPos = parseInt(options["getSEChallengeData"]);
      let challengeData = await this.childChain.getChallengeData(utxoPos);

      Util.printObject(challengeData);
      return challengeData;
    } else if (options["challengeSE"]) {
      const challengeDataRaw = fs.readFileSync(options["challengeSE"]);
      const challengeData = JSONbig.parse(challengeDataRaw);

      challengeData.exit_id = new BigNumber(challengeData.exit_id);

      const receipt = await this.rootChain.challengeStandardExit({
        standardExitId: challengeData.exit_id,
        exitingTx: challengeData.exiting_tx,
        challengeTx: challengeData.txbytes,
        inputIndex: challengeData.input_index,
        challengeTxSig: challengeData.sig,
        txOptions: this.txOptions
      });

      Util.printEtherscanLink(receipt.transactionHash, this.config);
      return receipt;
    } else if (options["getIFEData"]) {
      const txRaw = fs.readFileSync(options["getIFEData"]);
      const tx = JSONbig.parse(txRaw);

      const typedData = transaction.getTypedData(
        tx,
        this.config.plasmaframework_contract_address
      );

      const privateKeys = new Array(tx.inputs.length).fill(
        this.txOptions.privateKey
      );

      const signatures = this.childChain.signTransaction(
        typedData,
        privateKeys
      );
      const signedTxn = this.childChain.buildSignedTransaction(
        typedData,
        signatures
      );

      const IFEData = await this.childChain.inFlightExitGetData(signedTxn);
      Util.printObject(IFEData);
    } else if (options["startIFE"]) {
      const txRaw = fs.readFileSync(options["startIFE"]);
      const exitData = JSONbig.parse(txRaw);

      const receipt = await this.rootChain.startInFlightExit({
        inFlightTx: exitData.in_flight_tx,
        inputTxs: exitData.input_txs,
        inputUtxosPos: exitData.input_utxos_pos,
        inputTxsInclusionProofs: exitData.input_txs_inclusion_proofs,
        inFlightTxSigs: exitData.in_flight_tx_sigs,
        txOptions: this.txOptions
      });
      Util.printEtherscanLink(receipt.transactionHash, this.config);
      return receipt;
    } else if (options["piggybackIFEOnOutput"]) {
      const receipt = await this.rootChain.piggybackInFlightExitOnOutput({
        inFlightTx: options["piggybackIFEOnOutput"],
        outputIndex: options["outputIndex"],
        txOptions: this.txOptions
      });
      Util.printEtherscanLink(receipt.transactionHash, this.config);
      return receipt;
    } else if (options["piggybackIFEOnInput"]) {
      const receipt = await this.rootChain.piggybackInFlightExitOnInput({
        inFlightTx: options["piggybackIFEOnInput"],
        inputIndex: options["inputIndex"],
        txOptions: this.txOptions
      });
      Util.printEtherscanLink(receipt.transactionHash, this.config);
      return receipt;
    } else if (options["getIFEId"]) {
      const exitId = await this.rootChain.getInFlightExitId({
        txBytes: options["getIFEId"]
      });
      console.log("Exit id: ", exitId);
      return exitId;
    } else if (options["challengeIFEInputSpent"]) {
      const challengeData = await this.childChain.inFlightExitGetInputChallengeData(
        options["challengeIFEInputSpent"],
        options["inputIndex"]
      );

      Util.printObject(challengeData);
      /*
      const receipt = await this.rootChain.challengeInFlightExitInputSpent({
        inFlightTx: challengeData.txbytes,
        inFlightTxInputIndex: 0,
        challengingTx: unsignCarolTx,
        challengingTxInputIndex: 0,
        challengingTxWitness: carolTxDecoded.sigs[0],
        inputTx: unsignInput,
        inputUtxoPos: utxoPosOutput,
        txOptions: txOptions
      });
  
      printEtherscanLink(receipt.transactionHash);
      return receipt;*/
    } else if (options["challengeIFEOutputSpent"]) {
      const challengeData = await this.childChain.inFlightExitGetOutputChallengeData(
        options["challengeIFEOutputSpent"],
        options["inputIndex"]
      );

      const receipt = await this.rootChain.challengeInFlightExitOutputSpent({
        inFlightTx: challengeData.in_flight_txbytes,
        inFlightTxInclusionProof: challengeData.in_flight_proof,
        inFlightTxOutputPos: challengeData.in_flight_output_pos,
        challengingTx: challengeData.spending_txbytes,
        challengingTxInputIndex: challengeData.spending_input_index,
        challengingTxWitness: challengeData.spending_sig,
        txOptions: this.txOptions
      });
      Util.printEtherscanLink(receipt.transactionHash, this.config);
      return receipt;
    } else if (options["challengeIFENotCanonical"]) {
      const competitor = await this.childChain.inFlightExitGetCompetitor(
        options["challengeIFENotCanonical"]
      );

      const receipt = await this.rootChain.challengeInFlightExitNotCanonical({
        inputTx: competitor.input_tx,
        inputUtxoPos: competitor.input_utxo_pos,
        inFlightTx: competitor.in_flight_txbytes,
        inFlightTxInputIndex: competitor.in_flight_input_index,
        competingTx: competitor.competing_txbytes,
        competingTxInputIndex: competitor.competing_input_index,
        competingTxPos: competitor.competing_tx_pos,
        competingTxInclusionProof: competitor.competing_proof,
        competingTxWitness: competitor.competing_sig,
        txOptions: this.txOptions
      });
      Util.printEtherscanLink(receipt.transactionHash, this.config);
      return receipt;
    } else if (options["respondToNonCanonicalChallenge"]) {
      const proof = await this.childChain.inFlightExitProveCanonical(
        options["challengeIFENotCanonical"]
      );

      const receipt = await this.rootChain.respondToNonCanonicalChallenge({
        inFlightTx: proof.in_flight_txbytes,
        inFlightTxPos: proof.in_flight_tx_pos,
        inFlightTxInclusionProof: proof.in_flight_proof,
        txOptions: this.txOptions
      });
      Util.printEtherscanLink(receipt.transactionHash, this.config);
      return receipt;
    } else if (options["deleteNonPiggybackedIFE"]) {
      const exitId = await this.rootChain.getInFlightExitId({
        txBytes: options["deleteNonPiggybackedIFE"]
      });

      console.log("Exit id: ", exitId);
      const receipt = await this.rootChain.deleteNonPiggybackedInFlightExit({
        exitId,
        txOptions: this.txOptions
      });

      console.log(`IFE successfully deleted`);
      Util.printEtherscanLink(receipt.transactionHash, this.config);
    } else if (options["processExits"]) {
      const receipt = await this.rootChain.processExits({
        token: options["processExits"],
        exitId: 0,
        maxExitsToProcess: 20,
        txOptions: this.txOptions
      });

      console.log(`Exits for queue ${options["processExits"]} processed`);
      Util.printEtherscanLink(receipt.transactionHash, this.config);
      return receipt;
    } else if (options["addExitQueue"]) {
      const hasToken = await this.rootChain.hasToken(options["addExitQueue"]);
      if (!hasToken) {
        console.log(`Adding exit queue for ${options["addExitQueue"]}`);
        const receipt = await this.rootChain.addToken({
          token: options["addExitQueue"],
          txOptions: this.txOptions
        });
        Util.printEtherscanLink(receipt.transactionHash, this.config);
        return receipt;
      } else {
        console.log(
          `Exit Queue for ${options["addExitQueue"]} has already been added`
        );
      }
    } else if (options["getExitQueue"]) {
      const queue = await this.rootChain.getExitQueue(options["getExitQueue"]);
      Util.printObject(queue);
      return queue;
    } else if (options["getByzantineEvents"]) {
      const response = await this.childChain.status();

      if (response["byzantine_events"].length) {
        Util.printObject("Byzantine events", response["byzantine_events"]);
      } else {
        console.log("No Byzantine events");
      }

      return response;
    } else if (options["getIFEs"]) {
      const response = await this.childChain.status();

      if (response["in_flight_exits"].length) {
        Util.printObject(response["in_flight_exits"]);
      } else {
        console.log("No IFEs");
      }

      return response;
    } else if (options["autoChallenge"]) {
      console.log("---> Watching for Byzantine events <---");
      let processedEvents: String[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const response = await this.childChain.status();

        for (const event of response["byzantine_events"]) {
          if (
            event.details.utxo_pos &&
            event.event === "invalid_exit" &&
            !processedEvents.includes(event.details.utxo_pos)
          ) {
            console.log("---");
            console.log(
              `Found Invalid SE exit for ${event.details.utxo_pos}. Challenge coming up.`
            );
            const challengeData = await this.childChain.getChallengeData(
              event.details.utxo_pos
            );

            const receipt = await this.rootChain.challengeStandardExit({
              standardExitId: challengeData.exit_id,
              exitingTx: challengeData.exiting_tx,
              challengeTx: challengeData.txbytes,
              inputIndex: challengeData.input_index,
              challengeTxSig: challengeData.sig,
              txOptions: this.txOptions
            });

            processedEvents.push(event.details.utxo_pos);

            console.log(`Challenge SE successful`);
            Util.printEtherscanLink(receipt.transactionHash, this.config);
            console.log("---");
          }
        }
        sleep.sleep(60);
      }
    } else if (options["parallelRuns"] && options["iterations"]) {
      const load = new Load(options["parallelRuns"], options["iterations"]);
      load.run();
    } else {
      return true;
    }
  }

  async prepareTx(file: String, customTxOptions?: any) {
    if (customTxOptions) {
      const txOptionsRaw = fs.readFileSync(customTxOptions);
      this.txOptions = JSON.parse(txOptionsRaw);
    }

    const txRaw = fs.readFileSync(file);
    const tx = JSON.parse(txRaw);
    let payments: any = [];

    for (const output of tx.outputs) {
      payments.push({
        owner: output.outputGuard,
        currency: transaction.ETH_CURRENCY,
        amount: output.amount
      });
    }

    const fee = {
      currency: transaction.ETH_CURRENCY
    };

    return await this.childChain.createTransaction({
      owner: this.txOptions.from,
      payments,
      fee,
      metadata: "1337"
    });
  }

  async getFees() {
    return await rpcAPI.post({
      url: `${this.config.watcher_url}/fees.all`,
      body: "",
      proxyUrl: ""
    });
  }

  async getFee(currency: any) {
    const fees = await this.getFees();
    for (const fee of fees["1"]) {
      if (fee.currency === currency) {
        return fee.amount;
      }
    }
    throw `Error: No fees discovered for ${currency}`;
  }
}
