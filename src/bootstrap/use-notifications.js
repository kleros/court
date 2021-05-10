import { useCallback, useEffect, useMemo, useState } from "react";
import KlerosLiquid from "../assets/contracts/kleros-liquid.json";
import Web3 from "web3";

const networkIDData = {
  1: {
    name: "",
    provider: "https://mainnet.infura.io/v3/261bdc527a49430b9b31d28ba9fecfde",
    nativeToken: "ETH",
    fromBlock: process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER
      ? Number(process.env.REACT_APP_KLEROS_LIQUID_BLOCK_NUMBER)
      : 0,
  },
  3: {
    name: "_ROPSTEN",
    provider: "https://ropsten.infura.io/v3/261bdc527a49430b9b31d28ba9fecfde",
    nativeToken: "ETH",
  },
  42: {
    name: "_KOVAN",
    provider: "https://kovan.infura.io/v3/261bdc527a49430b9b31d28ba9fecfde",
    nativeToken: "ETH",
  },
  77: {
    name: "_SOKOL",
    provider: "https://sokol.poa.network",
    nativeToken: "SPOA",
  },
  100: {
    name: "_XDAI",
    provider: "https://rpc.xdaichain.com",
    nativeToken: "xDAI",
  },
};

const createHandlers = ({ nativeToken, fromBlock }) => ({
  AppealDecision: async (_, klerosLiquid, block, event) => {
    const dispute = await klerosLiquid.methods.disputes(event.returnValues._disputeID).call();
    if (dispute.period !== "4") {
      const notification = {
        date: new Date(block.timestamp * 1000),
        icon: "alert",
        message: `Case #${event.returnValues._disputeID} has been appealed.`,
        to: `/cases/${event.returnValues._disputeID}`,
        type: "info",
      };
      return (
        await klerosLiquid.getPastEvents("Draw", {
          filter: { _disputeID: event.returnValues._disputeID },
          fromBlock,
        })
      ).map((d) => ({
        ...notification,
        account: d.returnValues._address,
        key: `${event.blockNumber}-${event.transactionIndex}-${event.logIndex}-${d.returnValues._address}`,
      }));
    }
  },
  Draw: async (_, klerosLiquid, block, event) => {
    const dispute = await klerosLiquid.methods.disputes(event.returnValues._disputeID).call();
    if (dispute.period !== "4") {
      const dispute2 = await klerosLiquid.methods.getDispute(event.returnValues._disputeID).call();
      if (Number(event.returnValues._appeal) === dispute2.votesLengths.length - 1)
        return [
          {
            account: event.returnValues._address,
            date: new Date(block.timestamp * 1000),
            icon: "alert",
            key: `${event.blockNumber}-${event.transactionIndex}-${event.logIndex}-${event.returnValues._address}`,
            message: `Congratulations! You have been drawn as a juror on case #${event.returnValues._disputeID}.`,
            to: `/cases/${event.returnValues._disputeID}`,
            type: "info",
          },
        ];
    }
  },
  TokenAndETHShift: async (web3, _, block, event) => {
    const time = block.timestamp * 1000;
    if (Date.now() - time < 6.048e8)
      return [
        {
          account: event.returnValues._address,
          date: new Date(time),
          icon: "reward",
          key: `${event.blockNumber}-${event.transactionIndex}-${event.logIndex}-${event.returnValues._address}`,
          message: `Case #${event.returnValues._disputeID} was executed. ${nativeToken}: ${Number(
            web3.utils.fromWei(event.returnValues._ETHAmount)
          ).toFixed(4)}, PNK: ${Number(web3.utils.fromWei(event.returnValues._tokenAmount)).toFixed(0)}.`,
          to: `/cases/${event.returnValues._disputeID}`,
          type: "info",
        },
      ];
  },
});

export default (networkID, onNewNotifications) => {
  const nativeToken = networkIDData[networkID].nativeToken || "ETH";
  const fromBlock = networkIDData[networkID].fromBlock || 0;

  const handlers = useMemo(() => createHandlers({ nativeToken, fromBlock }), [nativeToken, fromBlock]);

  const [notifications, setNotifications] = useState();
  const onNotificationClick = useCallback(
    ({ currentTarget: { id } }) =>
      setNotifications((notifications) => {
        localStorage.setItem(id, true);
        const index = notifications.findIndex((n) => n.key === id);
        return [...notifications.slice(0, index), ...notifications.slice(index + 1)];
      }),
    []
  );

  useEffect(() => {
    const web3 = new Web3(networkIDData[networkID].provider);
    const klerosLiquid = new web3.eth.Contract(
      KlerosLiquid.abi,
      process.env[`REACT_APP_KLEROS_LIQUID${networkIDData[networkID].name}_ADDRESS`]
    );
    let mounted = true;
    web3.eth.getBlockNumber().then((blockNumber) => {
      const fromBlock = blockNumber - 256;
      Promise.all([
        klerosLiquid.getPastEvents("AppealDecision", { fromBlock }),
        klerosLiquid.getPastEvents("Draw", { fromBlock }),
        klerosLiquid.getPastEvents("TokenAndETHShift", { fromBlock }),
      ]).then(async ([events1, events2, events3]) => {
        const notifications = [];
        for (const event of [...events1, ...events2, ...events3]) {
          let _notifications = await handlers[event.event](
            web3,
            klerosLiquid,
            await web3.eth.getBlock(event.blockNumber),
            event
          );
          if (_notifications) {
            _notifications = _notifications.filter((n) => !localStorage.getItem(n.key));
            if (_notifications.length !== 0) notifications.push(..._notifications);
          }
        }
        if (mounted) {
          setNotifications([...notifications].reverse());
          onNewNotifications(notifications, onNotificationClick);
        }
      });
    });
    const listener = klerosLiquid.events.allEvents({ fromBlock: 0 }).on("data", async (event) => {
      if (handlers[event.event]) {
        const notifications = handlers[event.event](
          web3,
          klerosLiquid,
          await web3.eth.getBlock(event.blockNumber),
          event
        );
        if (notifications && mounted) {
          setNotifications((_notifications) => [...[...notifications].reverse(), ..._notifications]);
          onNewNotifications(notifications, onNotificationClick);
        }
      }
    });
    return () => {
      listener.unsubscribe();
      mounted = false;
    };
  }, [networkID, handlers, onNewNotifications, onNotificationClick]);
  return { notifications, onNotificationClick };
};
