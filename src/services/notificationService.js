const admin = require("../config/firebase");
const User = require("../models/User");

const stringifyDataValues = (data = {}) =>
  Object.entries(data).reduce((acc, [key, value]) => {
    acc[key] = value === undefined || value === null ? "" : String(value);
    return acc;
  }, {});

const collectInvalidTokens = (responses, tokens) =>
  responses
    .map((res, index) => (res.success ? null : tokens[index]))
    .filter(Boolean);

const removeInvalidTokens = async (user, invalidTokens) => {
  if (!invalidTokens.length) return;

  user.deviceTokens = user.deviceTokens.filter(
    (token) => !invalidTokens.includes(token)
  );
  await user.save();
};

async function sendPushNotification({
  userId,
  user: preloadedUser,
  title,
  body,
  data = {},
  android,
  apns,
}) {
  const targetUser =
    preloadedUser ||
    (userId
      ? await User.findById(userId).select("deviceTokens allNotifications")
      : null);

  // if (!targetUser || !targetUser.deviceTokens?.length) {
  //   return { skipped: true, reason: 'NO_DEVICE_TOKENS' };
  // }
  if (!targetUser) {
    return { skipped: true, reason: "USER_NOT_FOUND" };
  }

  // ❌ If user disabled all notifications → skip
  if (targetUser.allNotifications === false) {
    console.log("[NotificationService] User disabled notifications", {
      userId: targetUser._id,
    });
    return { skipped: true, reason: "NOTIFICATIONS_DISABLED" };
  }

  if (!targetUser.deviceTokens?.length) {
    return { skipped: true, reason: "NO_DEVICE_TOKENS" };
  }

  const payload = {
    tokens: targetUser.deviceTokens,
    notification: { title, body },
    data: stringifyDataValues(data),
    android,
    apns,
  };

  console.log("[NotificationService] Sending push notification", {
    userId: targetUser._id,
    tokenCount: targetUser.deviceTokens.length,
    tokens: targetUser.deviceTokens,
    title,
    body,
    data: payload.data,
  });

  const response = await admin.messaging().sendEachForMulticast(payload);
  const invalidTokens = collectInvalidTokens(
    response.responses,
    targetUser.deviceTokens
  );
  await removeInvalidTokens(targetUser, invalidTokens);

  console.log("[NotificationService] Push result", {
    userId: targetUser._id,
    successCount: response.successCount,
    failureCount: response.failureCount,
    invalidTokens,
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    invalidTokens,
  };
}

module.exports = {
  sendPushNotification,
};
