// API-Konfiguration für Cardano Blockchain
const CONFIG = {
    // Blockfrost APIs
    blockfrost: {
        preprod: {
            url: 'https://cardano-preprod.blockfrost.io/api/v0',
            apiKey: 'preprodBK8iIIEzfXrzt1tTkhGcbmLNCbRNQnMx'
        },
        mainnet: {
            url: 'https://cardano-mainnet.blockfrost.io/api/v0',
            apiKey: 'mainnetO1cG3YdwVUoEApkUqh9us0SQTguhmjoV'
        }
    },
    
    // Ogmios API
    ogmios: {
        url: 'https://ogmios1phe89589psdxsg00kh8.cardano-preprod-v6.ogmios-m1.dmtr.host',
        apiKey: 'ogmios1phe89589psdxsg00kh8'
    },
    
    // Kupo API
    kupo: {
        url: 'https://kupo1gnldyu3nnsu25pea823.cardano-preprod-v2.kupo-m1.dmtr.host',
        apiKey: 'kupo1gnldyu3nnsu25pea823'
    },
    
    // Aktives Netzwerk
    activeNetwork: 'preprod' // 'preprod' oder 'mainnet'
};

// Helper-Funktion für Blockfrost API-Calls
async function blockfrostRequest(endpoint, network = CONFIG.activeNetwork) {
    const config = CONFIG.blockfrost[network];
    const response = await fetch(`${config.url}${endpoint}`, {
        headers: {
            'project_id': config.apiKey
        }
    });
    
    if (!response.ok) {
        // Versuche detaillierte Fehlermeldung zu lesen
        let errorMessage = `${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData.message) {
                errorMessage = errorData.message;
            } else if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch (e) {
            // Fehler beim Parsen ignorieren
        }
        
        throw new Error(`Blockfrost API Error: ${errorMessage}`);
    }
    
    return await response.json();
}

// Helper-Funktion für Kupo API-Calls
async function kupoRequest(endpoint) {
    const response = await fetch(`${CONFIG.kupo.url}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${CONFIG.kupo.apiKey}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`Kupo API Error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

// Helper-Funktion für Ogmios WebSocket (JSON-RPC)
async function ogmiosRequest(method, params = {}) {
    const response = await fetch(CONFIG.ogmios.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.ogmios.apiKey}`
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: Date.now()
        })
    });
    
    if (!response.ok) {
        throw new Error(`Ogmios API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.error) {
        throw new Error(`Ogmios Error: ${data.error.message}`);
    }
    
    return data.result;
}
