import { Address } from "@graphprotocol/graph-ts";
import { Stake, Unstake } from "../generated/schema";

import { StakeCall, UnstakeCall } from "../generated/BrickStaking/BrickStaking";
import { toDecimal } from "./utils/Decimals";
import { loadOrCreateBRICKie, updateBrickieBalance } from "./utils/BRICKie";
import { loadOrCreateTransaction } from "./utils/Transactions";
import { updateProtocolMetrics } from "./utils/ProtocolMetrics";

export function handleStake(call: StakeCall): void {
  let brickie = loadOrCreateBRICKie(call.from as Address);
  let transaction = loadOrCreateTransaction(call.transaction, call.block);
  let value = toDecimal(call.inputs._amount, 9);

  let stake = new Stake(transaction.id);
  stake.transaction = transaction.id;
  stake.brickie = brickie.id;
  stake.amount = value;
  stake.timestamp = transaction.timestamp;
  stake.save();

  updateBrickieBalance(brickie, transaction);
  updateProtocolMetrics(transaction);
}

export function handleUnstake(call: UnstakeCall): void {
  let brickie = loadOrCreateBRICKie(call.from as Address);
  let transaction = loadOrCreateTransaction(call.transaction, call.block);
  let value = toDecimal(call.inputs._amount, 9);

  let unstake = new Unstake(transaction.id);
  unstake.transaction = transaction.id;
  unstake.brickie = brickie.id;
  unstake.amount = value;
  unstake.timestamp = transaction.timestamp;
  unstake.save();

  updateBrickieBalance(brickie, transaction);
  updateProtocolMetrics(transaction);
}
