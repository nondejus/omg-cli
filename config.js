/* eslint-disable no-undef */
require("dotenv").config();

const config = {
  eth_node: process.env.ETH_NODE,
  watcher_url: process.env.WATCHER_URL,
  watcher_proxy_url: process.env.WATCHER_PROXY_URL,
  plasmaframework_contract_address:
    process.env.PLASMAFRAMEWORK_CONTRACT_ADDRESS,
  erc20_contract: process.env.ERC20_CONTRACT
    ? process.env.ERC20_CONTRACT
    : undefined,
  block_explorer_url: process.env.BLOCKEXPLORER_URL,
  tenderly_project_url: process.env.TENDERLY_PROJECT_URL,
  alice_eth_address: process.env.ALICE_ETH_ADDRESS,
  alice_eth_address_private_key: process.env.ALICE_ETH_ADDRESS_PRIVATE_KEY,
  bob_eth_address: process.env.BOB_ETH_ADDRESS,
  bob_eth_address_private_key: process.env.BOB_ETH_ADDRESS_PRIVATE_KEY,
  charlie_eth_address: process.env.CHARLIE_ETH_ADDRESS,
  charlie_eth_address_private_key: process.env.CHARLIE_ETH_ADDRESS_PRIVATE_KEY,
  alice_eth_deposit_amount: process.env.ALICE_ETH_DEPOSIT_AMOUNT || "0.01",
  alice_erc20_deposit_amount: process.env.ALICE_ERC20_DEPOSIT_AMOUNT || "20",
  alice_eth_transfer_amount: process.env.ALICE_ETH_TRANSFER_AMOUNT || "0.005",
  alice_erc20_transfer_amount: process.env.ALICE_ERC20_TRANSFER_AMOUNT || "5",
  millis_to_wait_for_next_block:
    process.env.MILLIS_TO_WAIT_FOR_NEXT_BLOCK || 1000,
  blocks_to_wait_for_txn: process.env.BLOCKS_TO_WAIT_FOR_TXN || 20
};

module.exports = config;
