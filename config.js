// API-Konfiguration für Cardano Blockchain
const CONFIG = {
    // Blockfrost APIs
    blockfrost: {
        preprod: {
            url: 'https://cardano-preprod.blockfrost.io/api/v0',
            apiKey: '' // Wird aus localStorage oder config.local.js geladen
        },
        mainnet: {
            url: 'https://cardano-mainnet.blockfrost.io/api/v0',
            apiKey: '' // Wird aus localStorage oder config.local.js geladen
        }
    },
    
    // Ogmios API
    ogmios: {
        url: '', // Wird aus localStorage oder config.local.js geladen
        apiKey: '' // Wird aus localStorage oder config.local.js geladen
    },
    
    // Kupo API
    kupo: {
        url: '', // Wird aus localStorage oder config.local.js geladen
        apiKey: '' // Wird aus localStorage oder config.local.js geladen
    },
    
    // Aktives Netzwerk
    activeNetwork: 'preprod' // 'preprod' oder 'mainnet'
};

// Lade Konfiguration aus verschiedenen Quellen
function loadConfig() {
    console.log('🔧 Loading configuration...');
    
    // 1. Versuche config.local.js zu laden (falls vorhanden)
    if (typeof LOCAL_CONFIG !== 'undefined') {
        console.log('✓ Loading config from config.local.js');
        if (LOCAL_CONFIG.blockfrost?.preprod?.apiKey) {
            CONFIG.blockfrost.preprod.apiKey = LOCAL_CONFIG.blockfrost.preprod.apiKey;
            console.log('  - Blockfrost Preprod API Key loaded');
        }
        if (LOCAL_CONFIG.blockfrost?.mainnet?.apiKey) {
            CONFIG.blockfrost.mainnet.apiKey = LOCAL_CONFIG.blockfrost.mainnet.apiKey;
            console.log('  - Blockfrost Mainnet API Key loaded');
        }
        if (LOCAL_CONFIG.ogmios?.url) {
            CONFIG.ogmios.url = LOCAL_CONFIG.ogmios.url;
        }
        if (LOCAL_CONFIG.ogmios?.apiKey) {
            CONFIG.ogmios.apiKey = LOCAL_CONFIG.ogmios.apiKey;
        }
        if (LOCAL_CONFIG.kupo?.url) {
            CONFIG.kupo.url = LOCAL_CONFIG.kupo.url;
        }
        if (LOCAL_CONFIG.kupo?.apiKey) {
            CONFIG.kupo.apiKey = LOCAL_CONFIG.kupo.apiKey;
        }
    } else {
        console.log('ℹ No config.local.js found');
    }
    
    // 2. Überschreibe mit localStorage (höchste Priorität)
    const savedApiKeys = localStorage.getItem('apiKeys');
    if (savedApiKeys) {
        try {
            const keys = JSON.parse(savedApiKeys);
            console.log('✓ Loading config from localStorage');
            
            if (keys.blockfrostPreprod) {
                CONFIG.blockfrost.preprod.apiKey = keys.blockfrostPreprod;
            }
            if (keys.blockfrostMainnet) {
                CONFIG.blockfrost.mainnet.apiKey = keys.blockfrostMainnet;
            }
            if (keys.ogmiosUrl) {
                CONFIG.ogmios.url = keys.ogmiosUrl;
            }
            if (keys.ogmiosKey) {
                CONFIG.ogmios.apiKey = keys.ogmiosKey;
            }
            if (keys.kupoUrl) {
                CONFIG.kupo.url = keys.kupoUrl;
            }
            if (keys.kupoKey) {
                CONFIG.kupo.apiKey = keys.kupoKey;
            }
        } catch (e) {
            console.error('Error loading API keys from localStorage:', e);
        }
    }
    
    // 3. Warne wenn keine API-Keys konfiguriert sind
    if (!CONFIG.blockfrost.preprod.apiKey && !CONFIG.blockfrost.mainnet.apiKey) {
        console.warn('⚠ No API keys configured! Please configure them in Settings or create config.local.js');
    } else {
        console.log('✓ Configuration loaded successfully');
    }
}

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
