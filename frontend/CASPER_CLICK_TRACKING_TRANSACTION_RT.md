# Tracking your transactions in real time

When using the `send()`method to request a transaction approval and deploy it to the network, the SDK can, optionally, establish a websocket connection with CSPR.click backend and receive real-time updates about the transaction execution.

Traditionally, applications had to rely on polling a backend service or querying a Casper node to know whether a transaction had been processed, confirmed, or rejected. This approach added complexity, increased latency, and delayed the user experience.

Using a websockets connection to listen for real-time updates, your application can:

* Receive immediate status notifications during the full transaction lifecycle.
* Update your UI with progress states (e.g., pending, processed, failed).
* Access result data without the need for extra API calls.

This makes it easier to build responsive, user-friendly applications that keep users informed in real time as their transactions move through the Casper Network.

<figure><img src="https://4098787943-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FMwTFKCda4irtFhY9tqGt%2Fuploads%2Fgit-blob-242a16e3607da6b281aacf3d95b650f1036e6955%2Fprocessing-updates.png?alt=media" alt="Waiting for transaction completion"><figcaption></figcaption></figure>

## Receive transaction updates

To wait for transaction execution and receive status updates, pass a callback function to the `send()` method. This function will be called with status updates as the transaction is approved and processed.

```javascript
const onStatusUpdate = (status, data) => {
    console.log('STATUS UPDATE', status, data);
    if (status === TransactionStatus.SENT)
        setWaitingIndicator();
    if (status === TransactionStatus.PROCESSED)
        parseProcessedTransaction();
};

clickRef
    .send(transaction, sender, onStatusUpdate)
    .then((res) => {
        // check result and update UI accordingly
    })
    .catch((err) => {
        alert('Error: ' + err);
        throw err;
    });
```

### Status values

The `status` argument passed to the callback function can have the following values:

| Value       | Description                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `sent`      | The transaction has been signed and successfully deployed to a Casper node.                                                           |
| `processed` | The transaction has been executed by the network. May result in success or failure.                                                   |
| `expired`   | The transaction’s time-to-live (TTL) elapsed before execution.                                                                        |
| `cancelled` | The user rejected the signature request.                                                                                              |
| `timeout`   | The SDK stopped listening for updates before the transaction was finalized. A custom timeout can be specified (default: 120 seconds). |
| `error`     | An unexpected error occurred while submitting or monitoring the transaction.                                                          |
| `ping`      | A heartbeat event sent periodically to indicate that the connection is still active..                                                 |

### Data with processed Status

When the transaction reaches the processed state, the callback function receives an additional data argument.

This object contains the full `Deploy` entity, as defined in the [CSPR.cloud REST API documentation](https://docs.cspr.cloud/rest-api/deploy#properties).

Your application can use this information to:

* Show whether the transaction succeeded or failed.
* Provide more detailed feedback (e.g., execution cost, error messages).
