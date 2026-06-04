const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

let wooApi = null;

if (
    process.env.WC_URL &&
    process.env.WC_CONSUMER_KEY &&
    process.env.WC_CONSUMER_SECRET
) {
    wooApi = new WooCommerceRestApi({
        url: process.env.WC_URL,
        consumerKey: process.env.WC_CONSUMER_KEY,
        consumerSecret: process.env.WC_CONSUMER_SECRET,
        version: "wc/v3"
    });
}

module.exports = wooApi;
