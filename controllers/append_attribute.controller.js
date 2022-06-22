var router = require('express').Router()
const useLocalStorage = require('../modules/useLocalStorage')
const usePlayer = require('../modules/usePlayer')
const useCollection = require('../modules/useCollection')
const useAttribute = require('../modules/useAttribute')
const useBigchaindb = require('../modules/useBigchaindb')
const user_wallet = require('../utils/user_wallet.json')
const useMongodb = require('../modules/useMongodb')

const { removeItem } = useLocalStorage()
const { getCollection, createCollection } = useCollection()
const { Assets, Transactions } = useMongodb()
const { getAttributes, createAttribute } = useAttribute()
const { player_login, player_logout, player_register, getPlayer } = usePlayer()
const { fetchLatestTransaction, updateSingleAsset } = useBigchaindb()
// api/products
router.post('/append_attribute', async (req, res) => {
    try {
        const props = req.body

        const assetsModel = await Assets()
        const transactionsModel = await Transactions()

        if (!props?.did || !props?.attributes || !Array.isArray(props?.attributes))
            return res.status(400).json("Unauthorized")

        var isCanAppend = true

        var fetchedLatestTransaction = await fetchLatestTransaction(props?.did)

        if (!fetchedLatestTransaction) {
            isCanAppend = false
            return res.status(400).json("Transaction does not exist")
        }

        // find the did
        var fetchedAsset = await assetsModel.findOne({
            "data.did": props?.did,
        })
        // console.log(fetchedAsset?.id)
        var fetchedAttributeLatestTransaction = await fetchLatestTransaction(fetchedAsset?.id)
        // console.log(fetchedAttributeLatestTransaction)


        var assetAppend

        if (!fetchedAsset) {
            console.log("creating")
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
            console.log("updating")

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
            // console.log(fetchedAttributeLatestTransaction.metadata)

            assetAppend = await updateSingleAsset({
                txCreatedID: fetchedAttributeLatestTransaction?.id,
                metadata: fetchedAttributeLatestTransaction.metadata,
                publicKey: user_wallet.publicKey,
                privateKey: user_wallet.privateKey,
            })
            // console.log(assetAppend)
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


