// Kopiere diese Datei zu config.local.js und füge deine API-Keys ein
// config.local.js wird NICHT ins Git committed!

const LOCAL_CONFIG = {
    blockfrost: {
        preprod: {
            apiKey: 'preprod_YOUR_API_KEY_HERE'
        },
        mainnet: {
            apiKey: 'mainnet_YOUR_API_KEY_HERE'
        }
    },
    
    ogmios: {
        url: 'YOUR_OGMIOS_URL_HERE',
        apiKey: 'YOUR_OGMIOS_API_KEY_HERE'
    },
    
    kupo: {
        url: 'YOUR_KUPO_URL_HERE',
        apiKey: 'YOUR_KUPO_API_KEY_HERE'
    }
};
