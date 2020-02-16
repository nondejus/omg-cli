const JSONbig = require("json-bigint");

export class Util {
  static printObject(o: any, message?: String) {
    if (message) {
      console.log(`${message}\n ${JSONbig.stringify(o, undefined, 2)}`);
    } else {
      console.log(JSONbig.stringify(o, undefined, 2));
    }
  }

  static printEtherscanLink(hash: string, config: any) {
    const regex = /https:\/\/(.*).infura.io\/.*/;
    const network = config.eth_node.match(regex)[1];
    if (network !== "mainnet")
      console.log(
        `TX on Etherscan: https://${network}.etherscan.io/tx/${hash}`
      );
    else if (network) {
      console.log(`TX on Etherscan: https://etherscan.io/tx/${hash}`);
    }
  }

  static printExplorerLinks(txReceipt: any, config: any) {
    this.printEtherscanLink(txReceipt.transactionHash, config);
    this.printTenderlyLink(txReceipt.transactionHash, config);
  }

  static printTenderlyLink(hash: string, config: any) {
    const regex = /https:\/\/(.*).infura.io\/.*/;
    const network = config.eth_node.match(regex)[1];

    if (network && config.tenderly_project_url) {
      console.log(
        `TX on Tenderly: ${config.tenderly_project_url}/tx/${network}/${hash}`
      );
    }
  }

  static printOMGBlockExplorerLink(hash: string, config: any) {
    console.log(
      `TX on OMG Network: ${config.block_explorer_url}transaction/${hash}`
    );
  }
}
