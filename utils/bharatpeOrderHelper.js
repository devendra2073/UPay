import paymentModel from "../schema/payment.model.js";

export const BHARATPE_QR_TTL_MS = 5 * 60 * 1000;

/**
 * Auto-expires and disables any BharatPe orders whose 5-minute window has elapsed.
 */
export const disableExpiredBharatPeOrders = async (MID = null) => {
  const now = new Date();
  const filter = {
    provider: "BHARATPE",
    isPaid: false,
    isDisabled: { $ne: true },
    expiresAt: { $lte: now }
  };
  if (MID) filter.MID = MID;

  await paymentModel.updateMany(filter, {
    $set: {
      isDisabled: true,
      status: "EXPIRED",
      disabledAt: now
    }
  });
};

/**
 * Checks a single order document and disables it in DB if its 5-minute BharatPe QR window has passed.
 * Returns true if the order is expired/disabled.
 */
export const expireBharatPeOrderIfNeeded = async (orderDoc) => {
  if (!orderDoc) return true;
  if (orderDoc.isPaid) return false;
  if (orderDoc.isDisabled || orderDoc.status === "EXPIRED") {
    return true;
  }

  if (
    orderDoc.provider === "BHARATPE" &&
    orderDoc.expiresAt &&
    new Date(orderDoc.expiresAt).getTime() <= Date.now()
  ) {
    const now = new Date();
    await paymentModel.updateOne(
      { _id: orderDoc._id, isPaid: false },
      {
        $set: {
          isDisabled: true,
          status: "EXPIRED",
          disabledAt: now
        }
      }
    );
    orderDoc.isDisabled = true;
    orderDoc.status = "EXPIRED";
    orderDoc.disabledAt = now;
    return true;
  }

  return false;
};

/**
 * Allocates a non-overlapping payable amount for a BharatPe order.
 * Since BharatPe does not support order/reference ID matching in allHistory,
 * any active (unpaid, non-disabled, non-expired) BharatPe order holding the same amount
 * causes an increment of 0.01 INR (1 paisa — smallest valid UPI decimal step)
 * until a free amount is found.
 * Once an order is fulfilled (isPaid: true) or expired/disabled, its amount can be reused.
 */
export const allocateUniqueBharatPeAmount = async (MID, targetAmount, excludeOrderId = null) => {
  const base = Math.max(1, Number(Number(targetAmount).toFixed(2)));

  // First clean up / disable any stale expired BharatPe orders for this merchant
  await disableExpiredBharatPeOrders(MID);

  const now = new Date();
  const activeQuery = {
    MID,
    provider: "BHARATPE",
    isPaid: false,
    isDisabled: { $ne: true },
    status: "PENDING",
    expiresAt: { $gt: now }
  };
  if (excludeOrderId) {
    activeQuery.order = { $ne: excludeOrderId };
  }

  const activeOrders = await paymentModel
    .find(activeQuery)
    .select("amount")
    .lean();

  const activePaiseSet = new Set(
    activeOrders.map((o) => Math.round(Number(o.amount || 0) * 100))
  );

  let candidatePaise = Math.round(base * 100);
  const startPaise = candidatePaise;

  // Increment by 1 paisa (0.01 INR) while another active unpaid order holds this exact amount
  while (activePaiseSet.has(candidatePaise)) {
    candidatePaise += 1;
  }

  const uniqueAmount = Number((candidatePaise / 100).toFixed(2));
  const offset = Number(((candidatePaise - startPaise) / 100).toFixed(2));

  return {
    amount: uniqueAmount,
    offset
  };
};
