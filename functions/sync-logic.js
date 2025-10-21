import fetch from 'node-fetch';
import { logger } from 'firebase-functions';
import { ACCOUNT_GROUPS } from './account-groups.js';

// --- Helper Functions ---
const parseNumber = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

const round = (value) => {
    return Math.round((value + Number.EPSILON) * 100) / 100;
};

const findGroup = (ucet) => {
    if (!ucet) return null;
    const group3 = ucet.substring(0, 3);
    const group2 = ucet.substring(0, 2);
    const group1 = ucet.substring(0, 1);
    return ACCOUNT_GROUPS[group3] || ACCOUNT_GROUPS[group2] || ACCOUNT_GROUPS[group1];
};

// --- Data Processing Functions ---

function processIncomeStatement(rawData) {
    let monthlyData = Array.from({ length: 12 }, (_, i) => ({ month: i + 1 }));

    rawData.forEach(row => {
        const ucet = String(row.ucet?.replace('code:', '') || '');
        const group = findGroup(ucet);
        if (!group || (group.type !== 'N' && group.type !== 'VYN')) return;

        for (let i = 0; i < 12; i++) {
            const month = monthlyData[i];
            const dal = parseNumber(row[`obratDal${String(i + 1).padStart(2, '0')}`]);
            const md = parseNumber(row[`obratMd${String(i + 1).padStart(2, '0')}`]);
            const amount = group.type === 'VYN' ? dal - md : md - dal;

            if (group.category) {
                month[group.category] = (month[group.category] || 0) + amount;
            }
        }
    });

    monthlyData.forEach(month => {
        month.revenue_total = Object.keys(month).filter(k => k.startsWith('revenue_')).reduce((sum, k) => sum + month[k], 0);
        month.costs_total = Object.keys(month).filter(k => k.startsWith('costs_')).reduce((sum, k) => sum + month[k], 0);
        month.profit_before_tax = month.revenue_total - month.costs_total;
        month.profit_after_tax = month.profit_before_tax - (month.costs_income_tax || 0);

        Object.keys(month).forEach(key => {
            if (typeof month[key] === 'number') {
                month[key] = round(month[key]);
            }
        });
    });

    return { monthly: monthlyData };
}

function processBalanceSheet(rawData) {
    let monthlyBalances = Array.from({ length: 13 }, (_, i) => ({ month: i }));

    rawData.forEach(row => {
        const ucet = String(row.ucet?.replace('code:', '') || '');
        const group = findGroup(ucet);
        if (!group || !['A', 'P', 'V'].includes(group.type)) return;
        
        const assignBalance = (month, balance) => {
             if (group.type === 'A') {
                if (group.category) month[group.category] = (month[group.category] || 0) + balance;
            } else if (group.type === 'P') {
                if (group.category) month[group.category] = (month[group.category] || 0) - balance; 
            } else if (group.type === 'V') {
                if (balance > 0) {
                    if (group.assetCat) month[group.assetCat] = (month[group.assetCat] || 0) + balance;
                } else {
                    if (group.liabilityCat) month[group.liabilityCat] = (month[group.liabilityCat] || 0) - balance;
                }
            }
        };
        
        assignBalance(monthlyBalances[0], parseNumber(row.pocatek));
        for (let i = 0; i < 12; i++) {
            assignBalance(monthlyBalances[i + 1], parseNumber(row[`stav${String(i + 1).padStart(2, '0')}`]));
        }
    });

    monthlyBalances.forEach(month => {
        month.fixed_assets_total = (month.fixed_assets_intangible || 0) + (month.fixed_assets_tangible_depreciated || 0) + (month.fixed_assets_tangible_non_depreciated || 0) + (month.fixed_assets_in_progress || 0) + (month.fixed_assets_advances || 0) + (month.fixed_assets_financial || 0);
        month.inventory_total = (month.inventory_material || 0) + (month.inventory_own_production || 0) + (month.inventory_goods || 0);
        month.receivables_total = (month.receivables_trade || 0) + (month.receivables_state_taxes || 0) + (month.receivables_employees_social || 0) + (month.receivables_partners || 0) + (month.receivables_other || 0);
        month.financial_assets_total = (month.financial_cash || 0) + (month.financial_bank || 0) + (month.financial_short_term_assets || 0) + (month.financial_transfers || 0);
        month.current_assets_total = month.inventory_total + month.receivables_total + month.financial_assets_total + (month.accruals_assets || 0);
        month.corrections_total = (month.corrections_depreciation_intangible || 0) + (month.corrections_depreciation_tangible || 0) + (month.corrections_impairment_fixed || 0) + (month.corrections_impairment_inventory || 0) + (month.corrections_impairment_financial_short_term || 0) + (month.corrections_impairment_receivables || 0);
        month.assets = month.fixed_assets_total + month.current_assets_total + month.corrections_total;
        month.equity_total = (month.equity_base_capital_funds || 0) + (month.equity_retained_earnings_funds || 0) + (month.equity_profit_loss || 0) + (month.equity_individual || 0);
        month.liabilities_long_term_total = (month.liabilities_reserves || 0) + (month.liabilities_bank_loans_long_term || 0) + (month.liabilities_other_long_term || 0) + (month.liabilities_deferred_tax || 0);
        month.liabilities_short_term_total = (month.liabilities_bank_loans_short_term || 0) + (month.liabilities_trade || 0) + (month.liabilities_reserves_short_term || 0) + (month.liabilities_employees_social || 0) + (month.liabilities_state_taxes || 0) + (month.liabilities_partners || 0) + (month.liabilities_other || 0);
        month.liabilities_total = month.liabilities_long_term_total + month.liabilities_short_term_total + (month.accruals_liabilities || 0);
        month.liabilities_and_equity = month.equity_total + month.liabilities_total;
        
        Object.keys(month).forEach(key => {
            if (typeof month[key] === 'number') {
                month[key] = round(month[key]);
            }
        });
    });

    return { monthly: monthlyBalances };
}


export function processRawData(rawData) {
    const incomeStatement = processIncomeStatement(rawData);
    const balanceSheet = processBalanceSheet(rawData);
    return { incomeStatement, balanceSheet };
}

// --- API Fetching ---

async function fetchFromAbraFlexi(fullUrl, user, password, year = "2025") {
    const baseUrl = fullUrl.endsWith('/') ? fullUrl : `${fullUrl}/`;
    const endpoint = `${baseUrl}stav-uctu/(ucetniObdobi%20%3D%20%22code%3A${year}%22)?limit=0&detail=full`;
    const credentials = Buffer.from(`${user}:${password}`).toString('base64');
    const headers = { 'Accept': 'application/json', 'Authorization': `Basic ${credentials}` };

    logger.info(`Fetching data from AbraFlexi endpoint: ${endpoint}`);
    const response = await fetch(endpoint, { method: 'GET', headers: headers });
    const responseText = await response.text();

    if (!response.ok) {
        logger.error(`AbraFlexi API request failed with status: ${response.status}`, { responseBody: responseText });
        throw new Error(`AbraFlexi API request failed: ${response.status} ${response.statusText}.`);
    }

    try {
        const jsonData = JSON.parse(responseText);
        return jsonData.winstrom['stav-uctu'];
    } catch (e) {
        logger.error('Failed to parse AbraFlexi response as JSON.', { rawResponse: responseText });
        throw new Error('Received a non-JSON response from AbraFlexi API.');
    }
}

export async function synchronizeCompanyData(companyData, abraFlexiPassword) {
    const { abraflexiUrl, abraflexiUser } = companyData;
    if (!abraflexiUrl || !abraflexiUser || !abraFlexiPassword) {
        throw new Error(`Missing AbraFlexi credentials for company ${companyData.name}`);
    }
    return await fetchFromAbraFlexi(abraflexiUrl, abraflexiUser, abraFlexiPassword);
}
