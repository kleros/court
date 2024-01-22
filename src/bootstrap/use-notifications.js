import { useCallback, useEffect, useMemo, useState } from "react";
import KlerosLiquid from "../assets/contracts/kleros-liquid.json";
import { getKlerosLiquidBlockNumber, getKlerosLiquidAddress } from "../helpers/deployments";
import { MAINNET, GOERLI, GNOSIS, CHIADO, SEPOLIA, getUrl } from "../helpers/networks";
import Web3 from "web3";

const networkIDData = {
  [MAINNET]: {
    name: "",
    provider: getUrl(MAINNET),
    nativeToken: "ETH",
    pnkToken: "PNK",
    fromBlock: getKlerosLiquidBlockNumber(1),
  },
  [GOERLI]: {
    name: "_GOERLI",
    provider: getUrl(GOERLI),
    nativeToken: "ETH",
    pnkToken: "PNK",
    fromBlock: getKlerosLiquidBlockNumber(5),
  },
  [GNOSIS]: {
    name: "_XDAI",
    provider: getUrl(GNOSIS),
    nativeToken: "xDAI",
    pnkToken: "stPNK",
    fromBlock: getKlerosLiquidBlockNumber(100),
  },
  [CHIADO]: {
    name: "_CHIADO",
    provider: getUrl(CHIADO),
    nativeToken: "xDAI",
    pnkToken: "PNK",
    fromBlock: getKlerosLiquidBlockNumber(10200),
  },
  [SEPOLIA]: {
    name: "_SEPOLIA",
    provider: getUrl(SEPOLIA),
    nativeToken: "ETH",
    pnkToken: "PNK",
    fromBlock: getKlerosLiquidBlockNumber(11155111),
  },
};

const createHandlers = ({ nativeToken, pnkToken, fromBlock }) => ({
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
          ).toFixed(4)}, ${pnkToken}: ${Number(web3.utils.fromWei(event.returnValues._tokenAmount)).toFixed(0)}.`,
          to: `/cases/${event.returnValues._disputeID}`,
          type: "info",
        },
      ];
  },
});

export default (networkID, onNewNotifications) => {
  const nativeToken = networkIDData[networkID]?.nativeToken ?? "ETH";
  const pnkToken = networkIDData[networkID]?.pnkToken ?? "PNK";
  const fromBlock = networkIDData[networkID]?.fromBlock ?? 0;

  const handlers = useMemo(() => createHandlers({ nativeToken, pnkToken, fromBlock }), [
    nativeToken,
    pnkToken,
    fromBlock,
  ]);

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
    if (!networkIDData[networkID]?.provider) {
      return;
    }

    const web3 = new Web3(networkIDData[networkID].provider);
    const klerosLiquid = new web3.eth.Contract(KlerosLiquid.abi, getKlerosLiquidAddress(networkID));
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
