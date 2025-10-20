import fetch from 'node-fetch';

// --- Configuration ---
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
  CONTRA_ASSETS: ['07', '08', '09'],
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

async function fetchFromAbraFlexi(fullUrl, user, password, year = "2025") {
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

  return await response.json();
}

// --- Data Processing Functions ---

function processIncomeStatement(rawData) {
    let monthlyData = Array.from({ length: 12 }, () => ({ revenue: 0, costs: 0, profit: 0, depreciation: 0 }));
    (rawData || []).forEach(row => {
        const ucet = String(row.ucet?.replace('code:', '') || '');
        if (ACCOUNT_CONFIG.REVENUE.some(prefix => ucet.startsWith(prefix))) {
            for (let i = 0; i < 12; i++) {
                monthlyData[i].revenue += (parseNumber(row[`obratDal${String(i + 1).padStart(2, '0')}`]) - parseNumber(row[`obratMd${String(i + 1).padStart(2, '0')}`]));
            }
        } else if (ACCOUNT_CONFIG.COSTS.some(prefix => ucet.startsWith(prefix))) {
            for (let i = 0; i < 12; i++) {
                const cost = parseNumber(row[`obratMd${String(i + 1).padStart(2, '0')}`]) - parseNumber(row[`obratDal${String(i + 1).padStart(2, '0')}`]);
                monthlyData[i].costs += cost;
                if (ucet.startsWith('551')) {
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
        cumulativeData.push({ month: i + 1, revenue: cumulativeRevenue, costs: cumulativeCosts, profit: cumulativeRevenue - cumulativeCosts });
    }
    return { monthly: monthlyData, cumulative: cumulativeData };
}

function processBalanceSheet(rawData) {
    const emptyMonth = () => ({ assets: 0, liabilities: 0, equity: 0, fixedAssets: 0, currentAssets: 0, cash: 0, receivables: 0, payables: 0, otherAssets: 0, otherLiabilities: 0 });
    let monthlyBalances = Array.from({ length: 13 }, emptyMonth);
    (rawData || []).forEach(row => {
        const ucet = String(row.ucet?.replace('code:', '') || '');
        if (!ucet) return;
        processBalance(monthlyBalances[0], ucet, parseNumber(row.pocatek));
        for (let i = 0; i < 12; i++) {
            processBalance(monthlyBalances[i + 1], ucet, parseNumber(row[`stav${String(i + 1).padStart(2, '0')}`]));
        }
    });
    return monthlyBalances.map((month, i) => {
        month.otherAssets = month.currentAssets - month.receivables - month.cash;
        month.month = i;
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
    if (ACCOUNT_CONFIG.PAYABLES.some(prefix => ucet.startsWith(prefix))) {
        monthData.payables += balance;
    }
}

/**
 * New exported function to process raw data.
 */
export function processRawData(rawData) {
    const incomeStatement = processIncomeStatement(rawData);
    const balanceSheet = { monthly: processBalanceSheet(rawData) };
    return { incomeStatement, balanceSheet };
}

/**
 * Main orchestrator function changed to ONLY fetch and return raw data.
 */
export async function synchronizeCompanyData(companyData, abraFlexiPassword) {
    const { abraflexiUrl, abraflexiUser } = companyData;
    if (!abraflexiUrl || !abraflexiUser || !abraFlexiPassword) {
        throw new Error(`Missing AbraFlexi credentials for company ${companyData.name}`);
    }
    return await fetchFromAbraFlexi(abraflexiUrl, abraflexiUser, abraFlexiPassword);
}
