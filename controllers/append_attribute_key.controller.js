var router = require('express').Router()
const { fetchLatestTransaction, updateSingleAsset } = require('../database/bigchaindb.database')
const user_wallet = require('../utils/user_wallet.json')
const { Assets, Transactions } = require('../database/mongodb.database')
const { createAttribute } = require('../modules/attribute_key.module')

// api/products
router.post('/append_attribute_key', async (req, res) => {
    try {
        const assetsModel = await Assets()
        const transactionsModel = await Transactions()

        var isCanAppend = true
        var assetAppend

        const props = req.body

        if (!props?.did || !props?.attributes || !Array.isArray(props?.attributes))
            return res.status(400).json("Unauthorized")

        var fetchedLatestTransaction = await fetchLatestTransaction(props?.did)

        if (!fetchedLatestTransaction) {
            isCanAppend = false
            return res.status(400).json("Transaction does not exist")
        }

        // find the did
        var fetchedAsset = await assetsModel.findOne({
            "data.did": props?.did,
        })

        if (!fetchedAsset) {
            // if dont exist create
            assetAppend = await createAttribute({
                asset: {
                    type: "attribute",
                    did: props?.did
                },
                metadata: {
                    attributes: props?.attributes,
                },
                publicKey: user_wallet?.publicKey,
                privateKey: user_wallet?.privateKey
            })
        } else {
            var fetchedAttributeLatestTransaction = await fetchLatestTransaction(fetchedAsset?.id)

            if (!fetchedAttributeLatestTransaction?.metadata?.attributes) {
                fetchedAttributeLatestTransaction.metadata.attributes = []
            }

            for (const attribute of props?.attributes) {
                for (var i = 0; i < fetchedAttributeLatestTransaction?.metadata?.attributes?.length; i++) {
                    if (attribute?.rarity === fetchedAttributeLatestTransaction?.metadata?.attributes[i].rarity) {
                        fetchedAttributeLatestTransaction.metadata.attributes[i].count = attribute?.count
                    }
                }
            }

            for (const attribute of props?.attributes) {
                for (const fetchedAttribute of fetchedAttributeLatestTransaction?.metadata?.attributes) {
                    if (attribute?.rarity === fetchedAttribute?.rarity) {
                        props.attributes = props?.attributes?.filter(x => {
                            return x?.rarity !== fetchedAttribute?.rarity
                        })
                    }
                }
            }

            for (const attribute of props?.attributes) {
                fetchedAttributeLatestTransaction.metadata.attributes.push(attribute)
            }

            assetAppend = await updateSingleAsset({
                txCreatedID: fetchedAttributeLatestTransaction?.id,
                metadata: fetchedAttributeLatestTransaction.metadata,
                publicKey: user_wallet.publicKey,
                privateKey: user_wallet.privateKey,
            })
        }

        if (JSON.stringify(assetAppend) != JSON.stringify({})) {
            return res.status(200).json(assetAppend)
        } else {
            return res.status(200).json("false")
        }
    } catch (error) {
        return res.status(400).json("Server error")
    }
})

module.exports = router;


