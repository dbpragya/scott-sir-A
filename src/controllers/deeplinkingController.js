const androidDeeplinkingController = async (req, res) => {
  try {
    const deepLinkData = [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.makeithappen.make_it_happen",
          sha256_cert_fingerprints: [
            "FE:05:96:4C:C6:B8:9A:05:3A:47:24:99:A4:1B:0D:B6:DD:F8:69:F8:3C:7C:8B:51:A5:4A:9A:C0:72:94:0C:F0",
          ],
        },
      },
    ];
    return res.status(200).json(deepLinkData);
  } catch (error) {
    console.error("Error in deep linking:", error);
    return res.status(500).send("Internal Server Error");
  }
};

module.exports = { androidDeeplinkingController };
