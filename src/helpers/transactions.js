import createError from "./create-error";

export async function* promiEventToAsyncGenerator(promiEvent) {
  const buffer = {
    state: TxState.None,
  };

  const txHashPromise = new Promise((resolve) => {
    promiEvent.once("transactionHash", (txHash) => {
      buffer.txHash = txHash;
      resolve({
        ...buffer,
        state: TxState.Pending,
      });
    });
  });

  const errorPromise = new Promise((_, reject) => {
    promiEvent.once("error", (err) => {
      reject(createError(err.message, null, { txHash: buffer.txHash }));
    });
  });

  const receiptPromise = new Promise((resolve) => {
    promiEvent.once("receipt", (receipt) => {
      buffer.receipt = receipt;
      resolve({
        ...buffer,
        state: TxState.Mined,
      });
    });
  });

  yield await Promise.race([txHashPromise, errorPromise]);
  yield await Promise.race([errorPromise, receiptPromise]);
}

export const TxState = {
  None: "none",
  Pending: "pending",
  Mined: "mined",
};
