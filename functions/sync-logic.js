import fetch from 'node-fetch';

// --- Configuration ---
// Based on the provided AppScript code for SK legislation
const ACCOUNT_CONFIG = {
  ASSETS: ['0', '1', '2'],
  LIABILITIES_AND_EQUITY: ['4'],
  REVENUE: ['6'],
  COSTS: ['5'],
  
  FIXED_ASSETS: ['0'],
  CURRENT_ASSETS: ['1', '2'],
  CASH_ACCOUNTS: ['21', '22'],
  RECEIVABLES: ['31'],
  PAYABLES: ['32'],
  EQUITY: ['4'],
  CONTRA_ASSETS: ['07', '08', '09'], // Depreciation accounts (Oprávky)
};

// --- Helper Functions ---
function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Fetches raw accounting data from the AbraFlexi API for a specific year.
 * @param {string} fullUrl The complete URL for the company's AbraFlexi endpoint.
 * @param {string} user The API username.
 * @param {string} password The API password.
 * @param {string} year The accounting year to fetch (e.g., "2025").
 * @returns {Promise<Array>} A promise that resolves to the raw account data.
 */
async function fetchFromAbraFlexi(fullUrl, user, password, year = "2025") {
  // Ensure the URL ends with a slash before appending the endpoint details
  const baseUrl = fullUrl.endsWith('/') ? fullUrl : `${fullUrl}/`;
  const endpoint = `${baseUrl}stav-uctu/(ucetniObdobi%20%3D%20%22code%3A${year}%22)?limit=0&detail=full`;
  const credentials = Buffer.from(`${user}:${password}`).toString('base64');
  
  const headers = {
    'Accept': 'application/json',
    'Authorization': `Basic ${credentials}`,
  };

  const response = await fetch(endpoint, { method: 'GET', headers: headers });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AbraFlexi API request failed: ${response.status} ${response.statusText}. Body: ${errorBody}`);
  }

  const jsonResponse = await response.json();
  return jsonResponse?.['winstrom']?.['stav-uctu'] || [];
}


// --- Data Processing Functions (Adapted from AppScript) ---

function processIncomeStatement(rawData) {
    let monthlyData = Array.from({ length: 12 }, () => ({ revenue: 0, costs: 0, profit: 0, depreciation: 0 }));

    rawData.forEach(row => {
        const ucet = String(row.ucet?.replace('code:', '') || '');

        if (ACCOUNT_CONFIG.REVENUE.some(prefix => ucet.startsWith(prefix))) {
            for (let i = 0; i < 12; i++) {
                const dal = parseNumber(row[`obratDal${String(i + 1).padStart(2, '0')}`]);
                const md = parseNumber(row[`obratMd${String(i + 1).padStart(2, '0')}`]);
                monthlyData[i].revenue += (dal - md);
            }
        } else if (ACCOUNT_CONFIG.COSTS.some(prefix => ucet.startsWith(prefix))) {
            for (let i = 0; i < 12; i++) {
                const md = parseNumber(row[`obratMd${String(i + 1).padStart(2, '0')}`]);
                const dal = parseNumber(row[`obratDal${String(i + 1).padStart(2, '0')}`]);
                const cost = md - dal;
                monthlyData[i].costs += cost;
                if (ucet.startsWith('551')) { // Depreciation costs
                    monthlyData[i].depreciation += cost;
                }
            }
        }
    });

    let cumulativeRevenue = 0, cumulativeCosts = 0;
    const cumulativeData = [];

    for (let i = 0; i < 12; i++) {
        monthlyData[i].profit = monthlyData[i].revenue - monthlyData[i].costs;
        monthlyData[i].month = i + 1;
        
        cumulativeRevenue += monthlyData[i].revenue;
        cumulativeCosts += monthlyData[i].costs;
        cumulativeData.push({
            month: i + 1,
            revenue: cumulativeRevenue,
            costs: cumulativeCosts,
            profit: cumulativeRevenue - cumulativeCosts,
        });
    }
    
    return { monthly: monthlyData, cumulative: cumulativeData };
}

function processBalanceSheet(rawData) {
    const emptyMonth = () => ({
        assets: 0, liabilities: 0, equity: 0,
        fixedAssets: 0, currentAssets: 0, cash: 0,
        receivables: 0, payables: 0, otherAssets: 0, otherLiabilities: 0
    });

    let monthlyBalances = Array.from({ length: 13 }, emptyMonth); // Month 0 is initial state

    rawData.forEach(row => {
        const ucet = String(row.ucet?.replace('code:', '') || '');
        if (!ucet) return;

        // Process initial balance (Pocatek)
        const pocatekBalance = parseNumber(row.pocatek);
        processBalance(monthlyBalances[0], ucet, pocatekBalance);

        // Process balances for each month (StavXX)
        for (let i = 0; i < 12; i++) {
            const balance = parseNumber(row[`stav${String(i + 1).padStart(2, '0')}`]);
            processBalance(monthlyBalances[i + 1], ucet, balance);
        }
    });

    // Final calculations and balance checks
    return monthlyBalances.map((month, i) => {
        month.otherAssets = month.currentAssets - month.receivables - month.cash;
        month.month = i;
        // ... add balance check logic if needed ...
        return month;
    });
}

function processBalance(monthData, ucet, balance) {
    if (ACCOUNT_CONFIG.CONTRA_ASSETS.some(prefix => ucet.startsWith(prefix))) {
        monthData.assets -= balance;
        monthData.fixedAssets -= balance;
    } else if (ACCOUNT_CONFIG.ASSETS.some(prefix => ucet.startsWith(prefix))) {
        monthData.assets += balance;
        if (ACCOUNT_CONFIG.FIXED_ASSETS.some(prefix => ucet.startsWith(prefix))) {
            monthData.fixedAssets += balance;
        } else {
            monthData.currentAssets += balance;
        }
        if (ACCOUNT_CONFIG.CASH_ACCOUNTS.some(prefix => ucet.startsWith(prefix))) {
            monthData.cash += balance;
        }
        if (ACCOUNT_CONFIG.RECEIVABLES.some(prefix => ucet.startsWith(prefix))) {
            monthData.receivables += balance;
        }
    } else if (ACCOUNT_CONFIG.LIABILITIES_AND_EQUITY.some(prefix => ucet.startsWith(prefix))) {
        monthData.liabilities += balance;
        if (ACCOUNT_CONFIG.EQUITY.some(prefix => ucet.startsWith(prefix))) {
            monthData.equity += balance;
        }
    }
     // Standalone Payables (Záväzky)
    if (ACCOUNT_CONFIG.PAYABLES.some(prefix => ucet.startsWith(prefix))) {
        monthData.payables += balance;
    }
}


/**
 * Main orchestrator function to sync data for a single company.
 * @param {object} companyData The company document from Firestore.
 * @param {string} abraFlexiPassword The password from Secret Manager.
 * @returns {Promise<object>} A promise that resolves to the processed financial data.
 */
export async function synchronizeCompanyData(companyData, abraFlexiPassword) {
    const { abraflexiUrl, abraflexiUser } = companyData;
    if (!abraflexiUrl || !abraflexiUser || !abraFlexiPassword) {
        throw new Error(`Missing AbraFlexi credentials for company ${companyData.name}`);
    }

    const rawData = await fetchFromAbraFlexi(abraflexiUrl, abraflexiUser, abraFlexiPassword);
    
    const incomeStatement = processIncomeStatement(rawData);
    const balanceSheet = { monthly: processBalanceSheet(rawData) };

    return {
        incomeStatement,
        balanceSheet,
        lastSync: new Date().toISOString(),
    };
}
