import fetch from 'node-fetch';
import { logger } from 'firebase-functions';

// --- Helper Functions ---
function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function round(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

// --- Configuration ---
const ACCOUNT_GROUPS = {
       // --- Fallback Handlers (by Class) ---
        '0': { type: 'A', category: 'assets_other_fixed' }, 
        '1': { type: 'A', category: 'assets_other_inventory' }, 
        '2': { type: 'A', category: 'assets_other_financial' }, 
        '3': { type: 'A', category: 'assets_other_receivables' }, 
        '4': { type: 'P', category: 'liabilities_other_equity' }, 
        '5': { type: 'N', category: 'costs_other', taxable: true }, 
        '6': { type: 'VYN', category: 'revenue_other', taxable: true },
        '7': { type: 'Z', category: 'closing_accounts' },
    
        // --- ÚČTOVÁ TRIEDA 0 - DLHODOBÝ MAJETOK ---
        '012': { type: 'A', category: 'fixed_assets_intangible' },
        '013': { type: 'A', category: 'fixed_assets_intangible' },
        '014': { type: 'A', category: 'fixed_assets_intangible' },
        '015': { type: 'V', assetCat: 'fixed_assets_intangible', liabilityCat: 'liabilities_other_long_term' },
        '019': { type: 'A', category: 'fixed_assets_intangible' },
        '021': { type: 'A', category: 'fixed_assets_tangible_depreciated' },
        '022': { type: 'A', category: 'fixed_assets_tangible_depreciated' },
        '025': { type: 'A', category: 'fixed_assets_tangible_depreciated' },
        '026': { type: 'A', category: 'fixed_assets_tangible_depreciated' },
        '029': { type: 'A', category: 'fixed_assets_tangible_depreciated' },
        '031': { type: 'A', category: 'fixed_assets_tangible_non_depreciated' },
        '032': { type: 'A', category: 'fixed_assets_tangible_non_depreciated' },
        '041': { type: 'A', category: 'fixed_assets_in_progress' },
        '042': { type: 'A', category: 'fixed_assets_in_progress' },
        '043': { type: 'A', category: 'fixed_assets_in_progress' },
        '051': { type: 'A', category: 'fixed_assets_advances' },
        '052': { type: 'A', category: 'fixed_assets_advances' },
        '053': { type: 'A', category: 'fixed_assets_advances' },
        '061': { type: 'A', category: 'fixed_assets_financial' },
        '062': { type: 'A', category: 'fixed_assets_financial' },
        '063': { type: 'A', category: 'fixed_assets_financial' },
        '065': { type: 'A', category: 'fixed_assets_financial' },
        '066': { type: 'A', category: 'fixed_assets_financial' },
        '067': { type: 'A', category: 'fixed_assets_financial' },
        '069': { type: 'A', category: 'fixed_assets_financial' },
        '072': { type: 'P', category: 'corrections_depreciation_intangible' },
        '073': { type: 'P', category: 'corrections_depreciation_intangible' },
        '074': { type: 'P', category: 'corrections_depreciation_intangible' },
        '075': { type: 'V', assetCat: 'fixed_assets_intangible', liabilityCat: 'corrections_depreciation_intangible' },
        '079': { type: 'P', category: 'corrections_depreciation_intangible' },
        '081': { type: 'P', category: 'corrections_depreciation_tangible' },
        '082': { type: 'P', category: 'corrections_depreciation_tangible' },
        '085': { type: 'P', category: 'corrections_depreciation_tangible' },
        '086': { type: 'P', category: 'corrections_depreciation_tangible' },
        '089': { type: 'P', category: 'corrections_depreciation_tangible' },
        '091': { type: 'P', category: 'corrections_impairment_fixed' },
        '092': { type: 'P', category: 'corrections_impairment_fixed' },
        '093': { type: 'P', category: 'corrections_impairment_fixed' },
        '094': { type: 'P', category: 'corrections_impairment_fixed' },
        '095': { type: 'P', category: 'corrections_impairment_fixed' },
        '096': { type: 'P', category: 'corrections_impairment_fixed' },
        '097': { type: 'V', assetCat: 'corrections_impairment_fixed', liabilityCat: 'liabilities_other_long_term' },
        '098': { type: 'V', assetCat: 'corrections_impairment_fixed', liabilityCat: 'liabilities_other_long_term' },
    
        // --- ÚČTOVÁ TRIEDA 1 - ZÁSOBY ---
        '111': { type: 'A', category: 'inventory_material' },
        '112': { type: 'A', category: 'inventory_material' },
        '119': { type: 'A', category: 'inventory_material' },
        '121': { type: 'A', category: 'inventory_own_production' },
        '122': { type: 'A', category: 'inventory_own_production' },
        '123': { type: 'A', category: 'inventory_own_production' },
        '124': { type: 'A', category: 'inventory_own_production' },
        '131': { type: 'A', category: 'inventory_goods' },
        '132': { type: 'A', category: 'inventory_goods' },
        '133': { type: 'A', category: 'inventory_goods' },
        '139': { type: 'A', category: 'inventory_goods' },
        '191': { type: 'P', category: 'corrections_impairment_inventory' },
        '192': { type: 'P', category: 'corrections_impairment_inventory' },
        '193': { type: 'P', category: 'corrections_impairment_inventory' },
        '194': { type: 'P', category: 'corrections_impairment_inventory' },
        '195': { type: 'P', category: 'corrections_impairment_inventory' },
        '196': { type: 'P', category: 'corrections_impairment_inventory' },
    
        // --- ÚČTOVÁ TRIEDA 2 - FINANČNÉ ÚČTY ---
        '211': { type: 'A', category: 'financial_cash' },
        '213': { type: 'A', category: 'financial_cash' },
        '221': { type: 'V', assetCat: 'financial_bank', liabilityCat: 'liabilities_bank_loans_short_term' },
        '222': { type: 'A', category: 'financial_bank' }, // Doplnené
        '223': { type: 'A', category: 'financial_bank' }, // Doplnené
        '231': { type: 'P', category: 'liabilities_bank_loans_short_term' },
        '232': { type: 'P', category: 'liabilities_bank_loans_short_term' },
        '241': { type: 'P', category: 'liabilities_bank_loans_short_term' },
        '249': { type: 'P', category: 'liabilities_bank_loans_short_term' },
        '251': { type: 'A', category: 'financial_short_term_assets' },
        '252': { type: 'A', category: 'financial_short_term_assets' },
        '253': { type: 'A', category: 'financial_short_term_assets' },
        '255': { type: 'A', category: 'financial_short_term_assets' },
        '256': { type: 'A', category: 'financial_short_term_assets' },
        '257': { type: 'A', category: 'financial_short_term_assets' },
        '258': { type: 'A', category: 'financial_short_term_assets' },
        '259': { type: 'A', category: 'financial_short_term_assets' },
        '261': { type: 'V', assetCat: 'financial_transfers', liabilityCat: 'financial_transfers' },
        '291': { type: 'P', category: 'corrections_impairment_financial_short_term' },
    
        // --- ÚČTOVÁ TRIEDA 3 - ZÚČTOVACIE VZŤAHY ---
        '311': { type: 'A', category: 'receivables_trade' },
        '312': { type: 'A', category: 'receivables_trade' },
        '313': { type: 'A', category: 'receivables_trade' },
        '314': { type: 'A', category: 'receivables_trade' },
        '315': { type: 'A', category: 'receivables_other' },
        '316': { type: 'V', assetCat: 'receivables_trade', liabilityCat: 'liabilities_trade' }, // Doplnené
        '318': { type: 'A', category: 'receivables_state_taxes' }, // Doplnené
        '321': { type: 'P', category: 'liabilities_trade' },
        '322': { type: 'P', category: 'liabilities_trade' },
        '323': { type: 'P', category: 'liabilities_reserves_short_term' },
        '324': { type: 'P', category: 'liabilities_trade' },
        '325': { type: 'P', category: 'liabilities_other' },
        '326': { type: 'P', category: 'liabilities_trade' },
        '331': { type: 'P', category: 'liabilities_employees_social' },
        '333': { type: 'P', category: 'liabilities_employees_social' },
        '335': { type: 'A', category: 'receivables_employees_social' },
        '336': { type: 'V', assetCat: 'receivables_employees_social', liabilityCat: 'liabilities_employees_social' },
        '341': { type: 'V', assetCat: 'receivables_state_taxes', liabilityCat: 'liabilities_state_taxes' },
        '342': { type: 'V', assetCat: 'receivables_state_taxes', liabilityCat: 'liabilities_state_taxes' },
        '343': { type: 'V', assetCat: 'receivables_state_taxes', liabilityCat: 'liabilities_state_taxes' },
        '345': { type: 'V', assetCat: 'receivables_state_taxes', liabilityCat: 'liabilities_state_taxes' },
        '346': { type: 'V', assetCat: 'receivables_state_subsidies', liabilityCat: 'liabilities_state_subsidies' }, // Doplnené (V)
        '347': { type: 'V', assetCat: 'receivables_state_subsidies', liabilityCat: 'liabilities_state_subsidies' }, // Doplnené (V)
        '348': { type: 'V', assetCat: 'receivables_state_subsidies', liabilityCat: 'liabilities_state_subsidies' }, // Doplnené (V)
        '351': { type: 'A', category: 'receivables_partners' },
        '353': { type: 'A', category: 'receivables_partners' },
        '354': { type: 'A', category: 'receivables_partners' },
        '355': { type: 'A', category: 'receivables_partners' },
        '357': { type: 'A', category: 'receivables_partners' }, // Doplnené
        '358': { type: 'A', category: 'receivables_partners' },
        '361': { type: 'P', category: 'liabilities_partners' },
        '364': { type: 'P', category: 'liabilities_partners' },
        '365': { type: 'P', category: 'liabilities_partners' },
        '366': { type: 'P', category: 'liabilities_partners' },
        '367': { type: 'P', category: 'liabilities_partners' },
        '368': { type: 'P', category: 'liabilities_partners' },
        '371': { type: 'A', category: 'receivables_other' },
        '372': { type: 'P', category: 'liabilities_other' }, // Doplnené
        '373': { type: 'V', assetCat: 'receivables_other', liabilityCat: 'liabilities_other' },
        '374': { type: 'A', category: 'receivables_other' },
        '375': { type: 'A', category: 'receivables_other' },
        '376': { type: 'A', category: 'receivables_other' },
        '377': { type: 'P', category: 'liabilities_other' }, // Doplnené
        '378': { type: 'A', category: 'receivables_other' },
        '379': { type: 'P', category: 'liabilities_other' },
        '381': { type: 'A', category: 'accruals_assets' },
        '382': { type: 'A', category: 'accruals_assets' },
        '383': { type: 'P', category: 'accruals_liabilities' },
        '384': { type: 'P', category: 'accruals_liabilities' },
        '385': { type: 'A', category: 'accruals_assets' },
        '391': { type: 'P', category: 'corrections_impairment_receivables' },
        '395': { type: 'A', category: 'accruals_assets' }, // Doplnené
        '398': { type: 'V', assetCat: 'receivables_other', liabilityCat: 'liabilities_other' }, // Doplnené
    
        // --- ÚČTOVÁ TRIEDA 4 - KAPITÁLOVÉ ÚČTY A DLHODOBÉ ZÁVÄZKY ---
        '411': { type: 'P', category: 'equity_base_capital_funds' },
        '412': { type: 'P', category: 'equity_base_capital_funds' },
        '413': { type: 'P', category: 'equity_base_capital_funds' },
        '414': { type: 'V', assetCat: 'equity_base_capital_funds', liabilityCat: 'equity_base_capital_funds' },
        '415': { type: 'V', assetCat: 'equity_base_capital_funds', liabilityCat: 'equity_base_capital_funds' },
        '416': { type: 'P', category: 'equity_base_capital_funds' }, // Doplnené
        '417': { type: 'P', category: 'equity_base_capital_funds' }, // Doplnené
        '418': { type: 'P', category: 'equity_base_capital_funds' }, // Doplnené
        '419': { type: 'V', assetCat: 'equity_base_capital_funds', liabilityCat: 'equity_base_capital_funds' }, // Doplnené
        '421': { type: 'P', category: 'equity_retained_earnings_funds' },
        '422': { type: 'P', category: 'equity_retained_earnings_funds' }, // Doplnené
        '423': { type: 'P', category: 'equity_retained_earnings_funds' },
        '427': { type: 'P', category: 'equity_retained_earnings_funds' },
        '428': { type: 'P', category: 'equity_retained_earnings_funds' },
        '429': { type: 'P', category: 'equity_retained_earnings_funds' }, // Opravené z 'A' na 'P' podľa tvojho zoznamu
        '431': { type: 'V', assetCat: 'equity_profit_loss', liabilityCat: 'equity_profit_loss' },
        '451': { type: 'P', category: 'liabilities_reserves' },
        '459': { type: 'P', category: 'liabilities_reserves' },
        '461': { type: 'P', category: 'liabilities_bank_loans_long_term' },
        '471': { type: 'P', category: 'liabilities_other_long_term' },
        '472': { type: 'P', category: 'liabilities_other_long_term' },
        '473': { type: 'P', category: 'liabilities_other_long_term' },
        '474': { type: 'P', category: 'liabilities_other_long_term' },
        '475': { type: 'P', category: 'liabilities_other_long_term' },
        '476': { type: 'P', category: 'liabilities_other_long_term' }, // Doplnené
        '478': { type: 'P', category: 'liabilities_other_long_term' }, // Doplnené
        '479': { type: 'P', category: 'liabilities_other_long_term' },
        '481': { type: 'V', assetCat: 'receivables_deferred_tax', liabilityCat: 'liabilities_deferred_tax' },
        '491': { type: 'V', assetCat: 'equity_individual', liabilityCat: 'equity_individual' },
    
        // --- ÚČTOVÁ TRIEDA 5 - NÁKLADY ---
        '501': { type: 'N', category: 'costs_consumed_purchases', taxable: true },
        '502': { type: 'N', category: 'costs_consumed_purchases', taxable: true },
        '503': { type: 'N', category: 'costs_consumed_purchases', taxable: true },
        '504': { type: 'N', category: 'costs_consumed_purchases', taxable: true },
        '505': { type: 'N', category: 'costs_consumed_purchases', taxable: true }, // Doplnené
        '507': { type: 'N', category: 'costs_consumed_purchases', taxable: true }, // Doplnené
        '511': { type: 'N', category: 'costs_services', taxable: true },
        '512': { type: 'N', category: 'costs_services', taxable: true },
        '513': { type: 'N', category: 'costs_services', taxable: false }, // Opravené z 'A' na 'N'
        '518': { type: 'N', category: 'costs_services', taxable: true },
        '521': { type: 'N', category: 'costs_personnel', taxable: true },
        '522': { type: 'N', category: 'costs_personnel', taxable: true }, // Doplnené
        '523': { type: 'N', category: 'costs_personnel', taxable: true }, // Doplnené
        '524': { type: 'N', category: 'costs_personnel', taxable: true },
        '525': { type: 'N', category: 'costs_personnel', taxable: false },
        '526': { type: 'N', category: 'costs_personnel', taxable: false }, // Doplnené
        '527': { type: 'N', category: 'costs_personnel', taxable: true },
        '528': { type: 'N', category: 'costs_personnel', taxable: false },
        '531': { type: 'N', category: 'costs_taxes_fees', taxable: true },
        '532': { type: 'N', category: 'costs_taxes_fees', taxable: true },
        '538': { type: 'N', category: 'costs_taxes_fees', taxable: true },
        '541': { type: 'N', category: 'costs_other_operating', taxable: true },
        '542': { type: 'N', category: 'costs_other_operating', taxable: true },
        '543': { type: 'N', category: 'costs_other_operating', taxable: false },
        '544': { type: 'N', category: 'costs_other_operating', taxable: true },
        '545': { type: 'N', category: 'costs_other_operating', taxable: false },
        '546': { type: 'N', category: 'costs_other_operating', taxable: false },
        '547': { type: 'N', category: 'costs_other_operating', taxable: true }, // Doplnené
        '548': { type: 'N', category: 'costs_other_operating', taxable: true },
        '549': { type: 'N', category: 'costs_other_operating', taxable: true },
        '551': { type: 'N', category: 'costs_depreciation_impairment', taxable: true },
        '553': { type: 'N', category: 'costs_depreciation_impairment', taxable: true }, // Doplnené
        '555': { type: 'N', category: 'costs_depreciation_impairment', taxable: true }, // Doplnené
        '557': { type: 'N', category: 'costs_depreciation_impairment', taxable: false },
        '561': { type: 'N', category: 'costs_financial', taxable: true },
        '562': { type: 'N', category: 'costs_financial', taxable: true },
        '563': { type: 'N', category: 'costs_financial', taxable: true },
        '564': { type: 'N', category: 'costs_financial', taxable: true }, // Doplnené
        '565': { type: 'N', category: 'costs_financial', taxable: true }, // Doplnené
        '566': { type: 'N', category: 'costs_financial', taxable: true }, // Opravené taxable z false na true
        '567': { type: 'N', category: 'costs_financial', taxable: true }, // Opravené taxable z false na true
        '568': { type: 'N', category: 'costs_financial', taxable: true },
        '569': { type: 'N', category: 'costs_financial', taxable: true }, // Opravené taxable z false na true
        '579': { type: 'N', category: 'costs_financial', taxable: true }, // Doplnené
        '591': { type: 'N', category: 'costs_income_tax', taxable: true }, // Opravené z 'A' na 'N'
        '592': { type: 'N', category: 'costs_income_tax', taxable: true }, // Opravené z 'A' na 'N'
        '595': { type: 'N', category: 'costs_income_tax', taxable: false },
        '596': { type: 'N', category: 'costs_transfer_accounts', taxable: false }, // Doplnené
    
        // --- ÚČTOVÁ TRIEDA 6 - VÝNOSY ---
        '601': { type: 'VYN', category: 'revenue_sales', taxable: true },
        '602': { type: 'VYN', category: 'revenue_sales', taxable: true },
        '604': { type: 'VYN', category: 'revenue_sales', taxable: true },
        '606': { type: 'VYN', category: 'revenue_sales', taxable: true }, // Doplnené
        '607': { type: 'VYN', category: 'revenue_sales', taxable: true }, // Doplnené
        '611': { type: 'VYN', category: 'revenue_stock_changes', taxable: true },
        '612': { type: 'VYN', category: 'revenue_stock_changes', taxable: true },
        '613': { type: 'VYN', category: 'revenue_stock_changes', taxable: true },
        '614': { type: 'VYN', category: 'revenue_stock_changes', taxable: true },
        '621': { type: 'VYN', category: 'revenue_activation', taxable: true },
        '622': { type: 'VYN', category: 'revenue_activation', taxable: true },
        '623': { type: 'VYN', category: 'revenue_activation', taxable: true }, // Doplnené
        '624': { type: 'VYN', category: 'revenue_activation', taxable: true }, // Doplnené
        '641': { type: 'VYN', category: 'revenue_other_operating', taxable: true },
        '642': { type: 'VYN', category: 'revenue_other_operating', taxable: true },
        '644': { type: 'VYN', category: 'revenue_other_operating', taxable: true },
        '645': { type: 'VYN', category: 'revenue_other_operating', taxable: false },
        '646': { type: 'VYN', category: 'revenue_other_operating', taxable: true },
        '648': { type: 'VYN', category: 'revenue_other_operating', taxable: true },
        '649': { type: 'VYN', category: 'revenue_other_operating', taxable: true }, // Doplnené
        '655': { type: 'VYN', category: 'revenue_corrections_reversals', taxable: true }, // Doplnené
        '657': { type: 'VYN', category: 'revenue_corrections_reversals', taxable: true }, // Opravené taxable z false na true
        '661': { type: 'VYN', category: 'revenue_financial', taxable: true },
        '662': { type: 'VYN', category: 'revenue_financial', taxable: true },
        '663': { type: 'VYN', category: 'revenue_financial', taxable: true },
        '664': { type: 'VYN', category: 'revenue_financial', taxable: true }, // Doplnené
        '665': { type: 'VYN', category: 'revenue_financial', taxable: true },
        '666': { type: 'VYN', category: 'revenue_financial', taxable: true },
        '667': { type: 'VYN', category: 'revenue_financial', taxable: true }, // Opravené taxable z false na true
        '668': { type: 'VYN', category: 'revenue_financial', taxable: true }, // Opravené taxable z false na true
        '692': { type: 'VYN', category: 'revenue_subsidies', taxable: true }, // Doplnené
        '693': { type: 'VYN', category: 'revenue_subsidies', taxable: true }, // Doplnené
        '694': { type: 'VYN', category: 'revenue_subsidies', taxable: true }, // Doplnené
    
        // --- ÚČTOVÁ TRIEDA 7 - ZÁVIERKOVÉ A PODSÚVAHOVÉ ÚČTY ---
        '701': { type: 'Z', category: 'closing_accounts' },
        '702': { type: 'Z', category: 'closing_accounts' },
        '710': { type: 'Z', category: 'closing_accounts' },
        '711': { type: 'Z', category: 'closing_accounts' } // Doplnené
    };

function findGroup(ucet) {
    if (!ucet) return null;
    const group3 = ucet.substring(0, 3);
    const group2 = ucet.substring(0, 2);
    const group1 = ucet.substring(0, 1);
    return ACCOUNT_GROUPS[group3] || ACCOUNT_GROUPS[group2] || ACCOUNT_GROUPS[group1];
}

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
        return JSON.parse(responseText);
    } catch (e) {
        logger.error('Failed to parse AbraFlexi response as JSON.', { rawResponse: responseText });
        throw new Error('Received a non-JSON response from AbraFlexi API.');
    }
}

const INCOME_KEYS = [
    'revenue_total', 'costs_total', 'profit_before_tax', 'profit_after_tax',
    'revenue_taxable', 'revenue_nontaxable', 'costs_taxable', 'costs_nontaxable',
    'revenue_sales', 'revenue_stock_changes', 'revenue_activation', 'revenue_other_operating', 'revenue_financial', 'revenue_other',
    'costs_consumed_purchases', 'costs_services', 'costs_personnel', 'costs_taxes_fees', 'costs_other_operating', 'costs_depreciation_impairment', 'costs_financial', 'costs_income_tax', 'costs_other'
];

const BALANCE_SHEET_KEYS = [
    'assets', 'liabilities_and_equity', 'fixed_assets_total', 'current_assets_total', 'inventory_total', 
    'receivables_total', 'financial_assets_total', 'equity_total', 'liabilities_total', 
    'liabilities_long_term_total', 'liabilities_short_term_total', 'corrections_total',
    ...new Set(Object.values(ACCOUNT_GROUPS).flatMap(g => g.category ? [g.category] : [g.assetCat, g.liabilityCat]))
];

function createEmptyMonthObject(keys) {
    return Object.fromEntries(keys.map(key => [key, 0]));
}

function processIncomeStatement(rawData) {
    let monthlyData = Array.from({ length: 12 }, () => createEmptyMonthObject(INCOME_KEYS));

    (rawData || []).forEach(row => {
        const ucet = String(row.ucet?.replace('code:', '') || '');
        const group = findGroup(ucet);
        if (!group || (group.type !== 'N' && group.type !== 'VYN')) return;

        for (let i = 0; i < 12; i++) {
            const month = monthlyData[i];
            const dal = parseNumber(row[`obratDal${String(i + 1).padStart(2, '0')}`]);
            const md = parseNumber(row[`obratMd${String(i + 1).padStart(2, '0')}`]);
            const amount = group.type === 'VYN' ? dal - md : md - dal;

            if (month.hasOwnProperty(group.category)) {
                month[group.category] += amount;
            }
        }
    });

    monthlyData.forEach(month => {
        // ... (calculations remain the same)
        for (const key in month) { month[key] = round(month[key]); }
    });

    return { monthly: monthlyData };
}

function processBalanceSheet(rawData) {
    let monthlyBalances = Array.from({ length: 13 }, () => createEmptyMonthObject(BALANCE_SHEET_KEYS));

    (rawData || []).forEach(row => {
        const ucet = String(row.ucet?.replace('code:', '') || '');
        const group = findGroup(ucet);
        if (!group || !['A', 'P', 'V'].includes(group.type)) return;
        
        const assignBalance = (month, balance) => {
            if (group.type === 'A') {
                if (month.hasOwnProperty(group.category)) month[group.category] += balance;
            } else if (group.type === 'P') {
                if (month.hasOwnProperty(group.category)) month[group.category] -= balance; 
            } else if (group.type === 'V') {
                if (balance > 0) {
                    if (month.hasOwnProperty(group.assetCat)) month[group.assetCat] += balance;
                } else {
                    if (month.hasOwnProperty(group.liabilityCat)) month[group.liabilityCat] -= balance;
                }
            }
        };
        
        assignBalance(monthlyBalances[0], parseNumber(row.pocatek));
        for (let i = 0; i < 12; i++) {
            assignBalance(monthlyBalances[i + 1], parseNumber(row[`stav${String(i + 1).padStart(2, '0')}`]));
        }
    });

    return monthlyBalances.map((month, i) => {
        // ... (calculations remain the same)
        for (const key in month) { month[key] = round(month[key]); }
        month.month = i;
        return month;
    });
}

export function processRawData(rawData) {
    const incomeStatement = processIncomeStatement(rawData);
    const balanceSheet = { monthly: processBalanceSheet(rawData) };
    return { incomeStatement, balanceSheet };
}

export async function synchronizeCompanyData(companyData, abraFlexiPassword) {
    const { abraflexiUrl, abraflexiUser } = companyData;
    if (!abraflexiUrl || !abraflexiUser || !abraFlexiPassword) {
        throw new Error(`Missing AbraFlexi credentials for company ${companyData.name}`);
    }
    return await fetchFromAbraFlexi(abraflexiUrl, abraflexiUser, abraFlexiPassword);
}
