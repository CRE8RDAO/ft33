import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { BrickERC20 } from "../../generated/BrickStaking/BrickERC20";
import { sBrickERC20 } from "../../generated/BrickStaking/sBrickERC20";
import { ERC20 } from "../../generated/BrickStaking/ERC20";
import { UniswapV2Pair } from "../../generated/BrickStaking/UniswapV2Pair";
import { BrickStaking } from "../../generated/BrickStaking/BrickStaking";

import { ProtocolMetric, Transaction } from "../../generated/schema";
import {
  ERC20FRAX_CONTRACT,
  UNI_BRICKFRAX_PAIR_BLOCK,
  BRICK_ERC20_CONTRACT,
  TREASURY_ADDRESS_BLOCK,
  SBRICK_ERC20_CONTRACT,
  TREASURY_ADDRESS,
  UNI_BRICKFRAX_PAIR,
  WETH_ERC20_CONTRACT,
  STAKING_CONTRACT_V1,
} from "./Constants";
import { dayFromTimestamp } from "./Dates";
import { toDecimal } from "./Decimals";
import {
  getBRICKUSDRate,
  getDiscountedPairUSD,
  getPairUSD,
  getETHUSDRate,
} from "./Price";
import { getHolderAux } from "./Aux";
import { updateBondDiscounts } from "./BondDiscounts";

export function loadOrCreateProtocolMetric(timestamp: BigInt): ProtocolMetric {
  let dayTimestamp = dayFromTimestamp(timestamp);

  let protocolMetric = ProtocolMetric.load(dayTimestamp);
  if (protocolMetric == null) {
    protocolMetric = new ProtocolMetric(dayTimestamp);
    protocolMetric.timestamp = timestamp;
    protocolMetric.brickCirculatingSupply = BigDecimal.fromString("0");
    protocolMetric.sBrickCirculatingSupply = BigDecimal.fromString("0");
    protocolMetric.totalSupply = BigDecimal.fromString("0");
    protocolMetric.brickPrice = BigDecimal.fromString("0");
    protocolMetric.marketCap = BigDecimal.fromString("0");
    protocolMetric.totalValueLocked = BigDecimal.fromString("0");
    protocolMetric.treasuryRiskFreeValue = BigDecimal.fromString("0");
    protocolMetric.treasuryMarketValue = BigDecimal.fromString("0");
    protocolMetric.nextEpochRebase = BigDecimal.fromString("0");
    protocolMetric.nextDistributedBrick = BigDecimal.fromString("0");
    protocolMetric.currentAPY = BigDecimal.fromString("0");
    protocolMetric.treasuryFraxRiskFreeValue = BigDecimal.fromString("0");
    protocolMetric.treasuryFraxMarketValue = BigDecimal.fromString("0");
    protocolMetric.treasuryWETHRiskFreeValue = BigDecimal.fromString("0");
    protocolMetric.treasuryWETHMarketValue = BigDecimal.fromString("0");
    protocolMetric.treasuryBrickFraxPOL = BigDecimal.fromString("0");
    // protocolMetric.treasuryBrickEthPOL = BigDecimal.fromString("0")
    protocolMetric.holders = BigInt.fromI32(0);

    protocolMetric.save();
  }
  return protocolMetric as ProtocolMetric;
}

function getTotalSupply(): BigDecimal {
  let brick_contract = BrickERC20.bind(
    Address.fromString(BRICK_ERC20_CONTRACT)
  );
  let total_supply = toDecimal(brick_contract.totalSupply(), 9);
  log.debug("Total Supply {}", [total_supply.toString()]);
  return total_supply;
}

function getTokenStaked(address: string): BigDecimal {
  let brick_contract = BrickERC20.bind(
    Address.fromString(BRICK_ERC20_CONTRACT)
  );
  let total_staked = toDecimal(
    brick_contract.balanceOf(Address.fromString(address)),
    9
  );
  log.debug("Total Staked {}", [total_staked.toString()]);
  return total_staked;
}

function getCriculatingSupply(): BigDecimal {
  let circ_supply = BigDecimal.fromString("0");
  const totalSupply: BigDecimal = getTotalSupply();
  const totalStaked: BigDecimal = getTokenStaked(STAKING_CONTRACT_V1);
  const totalDeposit: BigDecimal = getTokenStaked(TREASURY_ADDRESS);

  circ_supply = totalSupply.minus(totalStaked).minus(totalDeposit);

  log.debug("Circulating Supply {}", [circ_supply.toString()]);
  return circ_supply;
}

function getSbrickSupply(transaction: Transaction): BigDecimal {
  let sbrick_supply = BigDecimal.fromString("0");

  let sbrick_contract_v1 = sBrickERC20.bind(
    Address.fromString(SBRICK_ERC20_CONTRACT)
  );
  sbrick_supply = toDecimal(sbrick_contract_v1.circulatingSupply(), 9);

  log.debug("sBRICK Supply {}", [sbrick_supply.toString()]);
  return sbrick_supply;
}

function getMV_RFV(transaction: Transaction): BigDecimal[] {
  let fraxERC20 = ERC20.bind(Address.fromString(ERC20FRAX_CONTRACT));
  let wethERC20 = ERC20.bind(Address.fromString(WETH_ERC20_CONTRACT));

  let brickfraxPair = UniswapV2Pair.bind(
    Address.fromString(UNI_BRICKFRAX_PAIR)
  );

  let treasury_address = TREASURY_ADDRESS;
  if (transaction.blockNumber.gt(BigInt.fromString(TREASURY_ADDRESS_BLOCK))) {
    treasury_address = TREASURY_ADDRESS;
  }

  let fraxBalance = fraxERC20.balanceOf(Address.fromString(treasury_address));

  let wethBalance = wethERC20.balanceOf(Address.fromString(treasury_address));
  let weth_value = toDecimal(wethBalance, 18).times(getETHUSDRate());

  //BRICKFRAX
  let brickfraxBalance = BigInt.fromI32(0);
  let brickfrax_value = BigDecimal.fromString("0");
  let brickfrax_rfv = BigDecimal.fromString("0");
  let brickfraxTotalLP = BigDecimal.fromString("0");
  let brickfraxPOL = BigDecimal.fromString("0");
  if (transaction.blockNumber.gt(BigInt.fromString(UNI_BRICKFRAX_PAIR_BLOCK))) {
    brickfraxBalance = brickfraxPair.balanceOf(
      Address.fromString(treasury_address)
    );
    brickfrax_value = getPairUSD(brickfraxBalance, UNI_BRICKFRAX_PAIR);
    brickfrax_rfv = getDiscountedPairUSD(brickfraxBalance, UNI_BRICKFRAX_PAIR);
    brickfraxTotalLP = toDecimal(brickfraxPair.totalSupply(), 18);
    if (
      brickfraxTotalLP.gt(BigDecimal.fromString("0")) &&
      brickfraxBalance.gt(BigInt.fromI32(0))
    ) {
      brickfraxPOL = toDecimal(brickfraxBalance, 18)
        .div(brickfraxTotalLP)
        .times(BigDecimal.fromString("100"));
    }
  }

  //BRICKETH
  // let brickethBalance = BigInt.fromI32(0)
  // let bricketh_value = BigDecimal.fromString("0")
  // let bricketh_rfv = BigDecimal.fromString("0")
  // let brickethTotalLP = BigDecimal.fromString("0")
  // let brickethPOL = BigDecimal.fromString("0")
  // if(transaction.blockNumber.gt(BigInt.fromString(SUSHI_BRICKETH_PAIR_BLOCK))){
  //     brickethBalance = brickethPair.balanceOf(Address.fromString(treasury_address))
  //     log.debug("brickethBalance {}", [brickethBalance.toString()])

  //     bricketh_value = getPairWETH(brickethBalance, SUSHI_BRICKETH_PAIR)
  //     log.debug("bricketh_value {}", [bricketh_value.toString()])

  //     bricketh_rfv = getDiscountedPairUSD(brickethBalance, SUSHI_BRICKETH_PAIR)
  //     brickethTotalLP = toDecimal(brickethPair.totalSupply(), 18)
  //     if (brickethTotalLP.gt(BigDecimal.fromString("0")) &&  brickethBalance.gt(BigInt.fromI32(0))){
  //         brickethPOL = toDecimal(brickethBalance, 18).div(brickethTotalLP).times(BigDecimal.fromString("100"))
  //     }
  // }

  let stableValue = fraxBalance;
  let stableValueDecimal = toDecimal(stableValue, 18);

  let lpValue = brickfrax_value;
  let rfvLpValue = brickfrax_rfv;

  let mv = stableValueDecimal.plus(lpValue).plus(weth_value);
  let rfv = stableValueDecimal.plus(rfvLpValue);

  log.debug("Treasury Market Value {}", [mv.toString()]);
  log.debug("Treasury RFV {}", [rfv.toString()]);
  log.debug("Treasury WETH value {}", [weth_value.toString()]);
  log.debug("Treasury Frax value {}", [toDecimal(fraxBalance, 18).toString()]);
  log.debug("Treasury BRICK-FRAX RFV {}", [brickfrax_rfv.toString()]);

  return [
    mv,
    rfv,
    // treasuryFraxRiskFreeValue = FRAX RFV * FRAX
    brickfrax_rfv.plus(toDecimal(fraxBalance, 18)),
    // treasuryFraxMarketValue = FRAX LP * FRAX
    brickfrax_value.plus(toDecimal(fraxBalance, 18)),
    weth_value, // bricketh_rfv = bricketh_value
    // POL
    brickfraxPOL,
  ];
}

// function getNextBRICKRebase(transaction: Transaction): BigDecimal {
//   let next_distribution = BigDecimal.fromString("0");

//   let staking_contract_v1 = BrickStaking.bind(
//     Address.fromString(STAKING_CONTRACT_V1)
//   );
//   let response = staking_contract_v1.try_ohmToDistributeNextEpoch();
//   if (response.reverted == false) {
//     next_distribution = toDecimal(response.value, 9);
//     log.debug("next_distribution v1 {}", [next_distribution.toString()]);
//   } else {
//     log.debug("reverted staking_contract_v1", []);
//   }

//   log.debug("next_distribution total {}", [next_distribution.toString()]);

//   return next_distribution;
// }

function getAPY_Rebase(
  sBRICK: BigDecimal,
  distributedBRICK: BigDecimal
): BigDecimal[] {
  let nextEpochRebase = distributedBRICK
    .div(sBRICK)
    .times(BigDecimal.fromString("100"));

  let nextEpochRebase_number = Number.parseFloat(nextEpochRebase.toString());
  let currentAPY =
    Math.pow(nextEpochRebase_number / 100 + 1, 365 * 3 - 1) * 100;

  let currentAPYdecimal = BigDecimal.fromString(currentAPY.toString());

  log.debug("next_rebase {}", [nextEpochRebase.toString()]);
  log.debug("current_apy total {}", [currentAPYdecimal.toString()]);

  return [currentAPYdecimal, nextEpochRebase];
}

function getRunway(
  sBRICK: BigDecimal,
  rfv: BigDecimal,
  rebase: BigDecimal
): BigDecimal[] {
  let runway2dot5k = BigDecimal.fromString("0");
  let runway5k = BigDecimal.fromString("0");
  let runway7dot5k = BigDecimal.fromString("0");
  let runway10k = BigDecimal.fromString("0");
  let runway20k = BigDecimal.fromString("0");
  let runway50k = BigDecimal.fromString("0");
  let runway70k = BigDecimal.fromString("0");
  let runway100k = BigDecimal.fromString("0");
  let runwayCurrent = BigDecimal.fromString("0");

  if (
    sBRICK.gt(BigDecimal.fromString("0")) &&
    rfv.gt(BigDecimal.fromString("0")) &&
    rebase.gt(BigDecimal.fromString("0"))
  ) {
    let treasury_runway = Number.parseFloat(rfv.div(sBRICK).toString());

    let runway2dot5k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.0029438) / 3;
    let runway5k_num = Math.log(treasury_runway) / Math.log(1 + 0.003579) / 3;
    let runway7dot5k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.0039507) / 3;
    let runway10k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.00421449) / 3;
    let runway20k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.00485037) / 3;
    let runway50k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.00569158) / 3;
    let runway70k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.00600065) / 3;
    let runway100k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.00632839) / 3;
    let nextEpochRebase_number = Number.parseFloat(rebase.toString()) / 100;
    let runwayCurrent_num =
      Math.log(treasury_runway) / Math.log(1 + nextEpochRebase_number) / 3;

    runway2dot5k = BigDecimal.fromString(runway2dot5k_num.toString());
    runway5k = BigDecimal.fromString(runway5k_num.toString());
    runway7dot5k = BigDecimal.fromString(runway7dot5k_num.toString());
    runway10k = BigDecimal.fromString(runway10k_num.toString());
    runway20k = BigDecimal.fromString(runway20k_num.toString());
    runway50k = BigDecimal.fromString(runway50k_num.toString());
    runway70k = BigDecimal.fromString(runway70k_num.toString());
    runway100k = BigDecimal.fromString(runway100k_num.toString());
    runwayCurrent = BigDecimal.fromString(runwayCurrent_num.toString());
  }

  return [
    runway2dot5k,
    runway5k,
    runway7dot5k,
    runway10k,
    runway20k,
    runway50k,
    runway70k,
    runway100k,
    runwayCurrent,
  ];
}

export function updateProtocolMetrics(transaction: Transaction): void {
  let pm = loadOrCreateProtocolMetric(transaction.timestamp);

  //Total Supply
  pm.totalSupply = getTotalSupply();

  //Circ Supply
  pm.brickCirculatingSupply = getCriculatingSupply();

  //sBrick Supply
  pm.sBrickCirculatingSupply = getSbrickSupply(transaction);

  //BRICK Price
  pm.brickPrice = getBRICKUSDRate();

  //BRICK Market Cap
  pm.marketCap = pm.brickCirculatingSupply.times(pm.brickPrice);

  //Total Value Locked
  pm.totalValueLocked = pm.sBrickCirculatingSupply.times(pm.brickPrice);

  //Treasury RFV and MV
  let mv_rfv = getMV_RFV(transaction);
  pm.treasuryMarketValue = mv_rfv[0];
  pm.treasuryRiskFreeValue = mv_rfv[1];
  pm.treasuryFraxRiskFreeValue = mv_rfv[2];
  pm.treasuryFraxMarketValue = mv_rfv[3];
  pm.treasuryWETHRiskFreeValue = mv_rfv[4];
  pm.treasuryWETHMarketValue = mv_rfv[4];
  pm.treasuryBrickFraxPOL = mv_rfv[5];

  //   // Rebase rewards, APY, rebase
  //   pm.nextDistributedBrick = getNextBRICKRebase(transaction);
  //   let apy_rebase = getAPY_Rebase(
  //     pm.sBrickCirculatingSupply,
  //     pm.nextDistributedBrick
  //   );
  //   pm.currentAPY = apy_rebase[0];
  //   pm.nextEpochRebase = apy_rebase[1];

  //Runway
  let runways = getRunway(
    pm.sBrickCirculatingSupply,
    pm.treasuryRiskFreeValue,
    pm.nextEpochRebase
  );
  pm.runway2dot5k = runways[0];
  pm.runway5k = runways[1];
  pm.runway7dot5k = runways[2];
  pm.runway10k = runways[3];
  pm.runway20k = runways[4];
  pm.runway50k = runways[5];
  pm.runway70k = runways[6];
  pm.runway100k = runways[7];
  pm.runwayCurrent = runways[8];

  //Holders
  pm.holders = getHolderAux().value;

  pm.save();

  updateBondDiscounts(transaction);
}
