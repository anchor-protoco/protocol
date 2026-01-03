# Contract-level events

The contract-level events stream provides the possibility to subscribe to events emitted by contracts during their execution. dApps rely on these events to know what happened during the contract execution to present this information to their users.

In addition to [Casper Event Standard (CES)](https://github.com/make-software/casper-event-standard), CSPR.cloud also provides integration with the legacy map-based events implemented as maps containing the event information to the network store, which look like this:

```json
[
  {
    "key": "contract_package_hash",
    "value": "c4e5a03066ce3c6006f562939e48f7076c77de5d46cf8fe625c41e02c5e74814"
  },
  {
    "key": "event_type",
    "value": "cep47_mint_one"
  },
  {
    "key": "recipient",
    "value": "Key::Account(4e37642c85513d3eef943d4f8250dec1e8c741e88b166f0e363e985d61e2a0c4)"
  },
  {
    "key": "token_id",
    "value": "1242"
  }
]
```

If you are a new developer, we recommend you to use CES when developing your smart contracts. It has become the de facto standard on the network and is already supported by the existing fungible and non-fungible (NFT) token standards, such as [CEP-18](https://github.com/casper-ecosystem/cep18), [CEP-47](https://github.com/casper-ecosystem/casper-nft-cep47), and [CEP-78](https://github.com/casper-ecosystem/cep-78-enhanced-nft).

## Properties

The `ContractLevelEvent` entity has the following properties:

| Property                | Type         | Description                                                                                                                                            |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `contract_package_hash` | `string(64)` | Contract package hash                                                                                                                                  |
| `contract_hash`         | `string(64)` | Contract hash. Present only for [CES](https://github.com/make-software/casper-event-standard) events                                                   |
| `data`                  | `JSON`       | Event data in the JSON format. Complex types may lose information because the `CLValue` type is wider that JSON. Please, use `raw_data` in such a case |
| `raw_data`              | `string`     | Event data represented as a hexadecimal string, similarly as presented in the deploy transform                                                         |
| `name`                  | `string`     | Event name                                                                                                                                             |

## Optional properties

| Property   | Type     | Description                                    |
| ---------- | -------- | ---------------------------------------------- |
| `raw_data` | `string` | Raw event data encoded as a hexadecimal string |

**Example**

```json
{
  "contract_package_hash": "0c66ee5cfe1ab3e1e7cae31f6c60fef631e7a7ee409a144cd19eeaeee20f4284",
  "contract_hash": "0fc4ba4162de03cd03f00521bbb481afd3c64a345436e9ebd9c7835e9d8c566d",
  "data": {
    "recipient": "account-hash-1856e4a0b23c70b64e4509987680de0d99145fa0cdc71ad9b78760e18ff0deec",
    "token_id": "3"
  }
  "raw_data": "00f8221af2ee00c69edbab4a02f523d324ce7282c8fc809fe84622bdb6b3f314420500e40b5402",
  "name": "Mint"
}
```

## Endpoint

```
GET /contract-events
```

## Query params

| Property                | Type     | Description                             |
| ----------------------- | -------- | --------------------------------------- |
| `contract_hash`         | `string` | Comma-separated contract hashes         |
| `contract_package_hash` | `string` | Comma-separated contract package hashes |

{% hint style="warning" %}
Exactly one `owner_hash` or `contract_package_hash` filter must be provided
{% endhint %}

## Events

| Event     | Description                                                               |
| --------- | ------------------------------------------------------------------------- |
| `emitted` | Notifies about new contract event being emitted during a deploy execution |

## Response

[`WebSocketMessage`](https://docs.cspr.cloud/reference#format)[`<ContractLevelEvent>`](#properties)

## Example

```bash
wscat -c 'wss://streaming.testnet.cspr.cloud/contract-events?contract_hash=0fc4ba4162de03cd03f00521bbb481afd3c64a345436e9ebd9c7835e9d8c566d,220cdd3ebf41503cad5dc094d0237d85fbd39bb585ce970e3d4c0ad9c6c1b413&includes=raw_data' \
  -H 'authorization: 55f79117-fc4d-4d60-9956-65423f39a06a'
```

```json
{
  "data": {
    "contract_package_hash": "523bfb3faec58c37be5637c1911e8545aa62d257a8f38a315fddedab56cb4406",
    "contract_hash": "220cdd3ebf41503cad5dc094d0237d85fbd39bb585ce970e3d4c0ad9c6c1b413",
    "data": {
      "choice": 1,
      "stake": "1000000000",
      "voter": "account-hash-f8221af2ee00c69edbab4a02f523d324ce7282c8fc809fe84622bdb6b3f31442",
      "voting_id": 6,
      "voting_type": 0
    },
    "raw_data": "00f8221af2ee00c69edbab4a02f523d324ce7282c8fc809fe84622bdb6b3f314420600000000000000010000000400ca9a3b",
    "name": "BallotCast"
  },
  "action": "emitted",
  "extra": {
    "deploy_hash": "8655a223c004c44115296db030780100981cd6f7fe499d676c3f93543baaeef1",
    "event_id": 13,
    "transform_id": 125
  },
  "timestamp": "2023-12-15T12:16:11.041209483Z"
}
```

To learn more, please proceed with an extended example described on the [Receiving contract-level events](https://docs.cspr.cloud/documentation/highlights/receiving-contract-level-events) page.
