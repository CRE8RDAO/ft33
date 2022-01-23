// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class BondingCalculator extends ethereum.SmartContract {
  static bind(address: Address): BondingCalculator {
    return new BondingCalculator("BondingCalculator", address);
  }

  OHM(): Address {
    let result = super.call("OHM", "OHM():(address)", []);

    return result[0].toAddress();
  }

  try_OHM(): ethereum.CallResult<Address> {
    let result = super.tryCall("OHM", "OHM():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  getKValue(_pair: Address): BigInt {
    let result = super.call("getKValue", "getKValue(address):(uint256)", [
      ethereum.Value.fromAddress(_pair)
    ]);

    return result[0].toBigInt();
  }

  try_getKValue(_pair: Address): ethereum.CallResult<BigInt> {
    let result = super.tryCall("getKValue", "getKValue(address):(uint256)", [
      ethereum.Value.fromAddress(_pair)
    ]);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  getTotalValue(_pair: Address): BigInt {
    let result = super.call(
      "getTotalValue",
      "getTotalValue(address):(uint256)",
      [ethereum.Value.fromAddress(_pair)]
    );

    return result[0].toBigInt();
  }

  try_getTotalValue(_pair: Address): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "getTotalValue",
      "getTotalValue(address):(uint256)",
      [ethereum.Value.fromAddress(_pair)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  markdown(_pair: Address): BigInt {
    let result = super.call("markdown", "markdown(address):(uint256)", [
      ethereum.Value.fromAddress(_pair)
    ]);

    return result[0].toBigInt();
  }

  try_markdown(_pair: Address): ethereum.CallResult<BigInt> {
    let result = super.tryCall("markdown", "markdown(address):(uint256)", [
      ethereum.Value.fromAddress(_pair)
    ]);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  valuation(_pair: Address, amount_: BigInt): BigInt {
    let result = super.call(
      "valuation",
      "valuation(address,uint256):(uint256)",
      [
        ethereum.Value.fromAddress(_pair),
        ethereum.Value.fromUnsignedBigInt(amount_)
      ]
    );

    return result[0].toBigInt();
  }

  try_valuation(_pair: Address, amount_: BigInt): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "valuation",
      "valuation(address,uint256):(uint256)",
      [
        ethereum.Value.fromAddress(_pair),
        ethereum.Value.fromUnsignedBigInt(amount_)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }
}

export class ConstructorCall extends ethereum.Call {
  get inputs(): ConstructorCall__Inputs {
    return new ConstructorCall__Inputs(this);
  }

  get outputs(): ConstructorCall__Outputs {
    return new ConstructorCall__Outputs(this);
  }
}

export class ConstructorCall__Inputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }

  get _OHM(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class ConstructorCall__Outputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }
}
