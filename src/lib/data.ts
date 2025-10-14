export const mockCompanies = [
  {
    id: 'demo1',
    name: 'Demo Firma s.r.o.',
    currency: 'EUR',
    accountingStandard: 'Slovenský',
    permissionType: 'ADMIN',
    lastActivity: 'Dnes',
    dataStatus: { status: 'VALID', message: 'Dáta sú platné' },
    ico: '12345678',
    dic: 'SK12345678',
  },
  {
    id: 'demo2',
    name: 'Test Spoločnosť a.s.',
    currency: 'EUR',
    accountingStandard: 'Slovenský',
    permissionType: 'MANAGER',
    lastActivity: 'Včera',
    dataStatus: { status: 'WARNING', message: 'Chýbajúce faktúry' },
    ico: '87654321',
    dic: 'SK87654321',
  },
];

const monthlyIncomeData = [
    { month: 1, revenue: 12000, costs: 7500, profit: 4500, depreciation: 500 },
    { month: 2, revenue: 13500, costs: 8000, profit: 5500, depreciation: 500 },
    { month: 3, revenue: 15000, costs: 9000, profit: 6000, depreciation: 500 },
    { month: 4, revenue: 14000, costs: 8500, profit: 5500, depreciation: 500 },
    { month: 5, revenue: 16000, costs: 9500, profit: 6500, depreciation: 500 },
    { month: 6, revenue: 18000, costs: 10000, profit: 8000, depreciation: 500 },
    { month: 7, revenue: 17500, costs: 10500, profit: 7000, depreciation: 500 },
    { month: 8, revenue: 19000, costs: 11000, profit: 8000, depreciation: 500 },
    { month: 9, revenue: 21000, costs: 12000, profit: 9000, depreciation: 500 },
    { month: 10, revenue: 22000, costs: 13000, profit: 9000, depreciation: 500 },
    { month: 11, revenue: 25000, costs: 15000, profit: 10000, depreciation: 500 },
    { month: 12, revenue: 28000, costs: 16000, profit: 12000, depreciation: 500 },
];

let cumulativeRevenue = 0;
let cumulativeCosts = 0;
let cumulativeProfit = 0;
const cumulativeIncomeData = monthlyIncomeData.map(item => {
    cumulativeRevenue += item.revenue;
    cumulativeCosts += item.costs;
    cumulativeProfit += item.profit;
    return {
        month: item.month,
        revenue: cumulativeRevenue,
        costs: cumulativeCosts,
        profit: cumulativeProfit,
    };
});


export const mockFinancialData = {
  demo1: {
    incomeStatement: {
      monthly: monthlyIncomeData,
      cumulative: cumulativeIncomeData,
    },
    balanceSheet: {
      monthly: [
        { month: 0, assets: 100000, liabilities: 50000, equity: 50000, cash: 10000, fixedAssets: 60000, receivables: 15000, payables: 20000, otherAssets: 15000, otherLiabilities: 30000 },
        { month: 1, assets: 104500, liabilities: 50000, equity: 54500, cash: 12000, fixedAssets: 59500, receivables: 17000, payables: 21000, otherAssets: 16000, otherLiabilities: 29000 },
        { month: 2, assets: 110000, liabilities: 50000, equity: 60000, cash: 15000, fixedAssets: 59000, receivables: 18000, payables: 20000, otherAssets: 18000, otherLiabilities: 30000 },
        { month: 3, assets: 116000, liabilities: 50000, equity: 66000, cash: 18000, fixedAssets: 58500, receivables: 20000, payables: 19000, otherAssets: 19500, otherLiabilities: 31000 },
        { month: 4, assets: 121500, liabilities: 50000, equity: 71500, cash: 20000, fixedAssets: 58000, receivables: 22000, payables: 22000, otherAssets: 21500, otherLiabilities: 28000 },
        { month: 5, assets: 128000, liabilities: 50000, equity: 78000, cash: 24000, fixedAssets: 57500, receivables: 24000, payables: 23000, otherAssets: 22500, otherLiabilities: 27000 },
        { month: 6, assets: 136000, liabilities: 50000, equity: 86000, cash: 28000, fixedAssets: 57000, receivables: 26000, payables: 21000, otherAssets: 25000, otherLiabilities: 29000 },
        { month: 7, assets: 143000, liabilities: 50000, equity: 93000, cash: 30000, fixedAssets: 56500, receivables: 28000, payables: 24000, otherAssets: 28500, otherLiabilities: 26000 },
        { month: 8, assets: 151000, liabilities: 50000, equity: 101000, cash: 35000, fixedAssets: 56000, receivables: 30000, payables: 25000, otherAssets: 30000, otherLiabilities: 25000 },
        { month: 9, assets: 160000, liabilities: 50000, equity: 110000, cash: 40000, fixedAssets: 55500, receivables: 32000, payables: 26000, otherAssets: 32500, otherLiabilities: 24000 },
        { month: 10, assets: 169000, liabilities: 50000, equity: 119000, cash: 45000, fixedAssets: 55000, receivables: 34000, payables: 27000, otherAssets: 35000, otherLiabilities: 23000 },
        { month: 11, assets: 179000, liabilities: 50000, equity: 129000, cash: 50000, fixedAssets: 54500, receivables: 36000, payables: 28000, otherAssets: 38500, otherLiabilities: 22000 },
        { month: 12, assets: 191000, liabilities: 50000, equity: 141000, cash: 55000, fixedAssets: 54000, receivables: 38000, payables: 29000, otherAssets: 44000, otherLiabilities: 21000 },
      ],
    },
  },
  // Data for demo2 can be added here
};

export const monthNames = ["Jan", "Feb", "Mar", "Apr", "Máj", "Jún", "Júl", "Aug", "Sep", "Okt", "Nov", "Dec"];
export const monthNamesFull = ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"];


export const mockAccountList = [
    { ucet: '211000', nazev: 'Pokladnica' },
    { ucet: '221000', nazev: 'Bankové účty' },
    { ucet: '311000', nazev: 'Odberatelia' },
    { ucet: '321000', nazev: 'Dodávatelia' },
    { ucet: '501000', nazev: 'Spotreba materiálu' },
    { ucet: '601000', nazev: 'Tržby za vlastné výrobky' },
];

// Define interfaces for mock account data to avoid 'any'
interface MonthlyAccountDetail {
  month: number;
  openingBalance: number;
  turnoverMd: number;
  turnoverDal: number;
  closingBalance: number;
}

interface AccountDetails {
  accountNumber: string;
  accountName: string;
  openingBalanceYear: number;
  monthlyDetails: MonthlyAccountDetail[];
}

export const mockAccountDetails: { [key: string]: AccountDetails } = {
  '221000': {
    accountNumber: '221000',
    accountName: 'Bankové účty',
    openingBalanceYear: 10000,
    monthlyDetails: [
      { month: 1, openingBalance: 10000, turnoverMd: 25000, turnoverDal: 23000, closingBalance: 12000 },
      { month: 2, openingBalance: 12000, turnoverMd: 28000, turnoverDal: 25000, closingBalance: 15000 },
      { month: 3, openingBalance: 15000, turnoverMd: 32000, turnoverDal: 29000, closingBalance: 18000 },
      // ... more months
    ]
  },
   '311000': {
    accountNumber: '311000',
    accountName: 'Odberatelia',
    openingBalanceYear: 15000,
    monthlyDetails: [
      { month: 1, openingBalance: 15000, turnoverMd: 12000, turnoverDal: 10000, closingBalance: 17000 },
      { month: 2, openingBalance: 17000, turnoverMd: 13500, turnoverDal: 12500, closingBalance: 18000 },
      { month: 3, openingBalance: 18000, turnoverMd: 15000, turnoverDal: 13000, closingBalance: 20000 },
       // ... more months
    ]
  }
};

// Fill in the rest of the months for mock data
for (let i = 4; i <= 12; i++) {
    const prev221 = mockAccountDetails['221000'].monthlyDetails[i - 2];
    mockAccountDetails['221000'].monthlyDetails.push({
        month: i,
        openingBalance: prev221.closingBalance,
        turnoverMd: 20000 + i * 1000,
        turnoverDal: 18000 + i * 800,
        closingBalance: prev221.closingBalance + (2000 + i * 200)
    });

    const prev311 = mockAccountDetails['311000'].monthlyDetails[i-2];
     mockAccountDetails['311000'].monthlyDetails.push({
        month: i,
        openingBalance: prev311.closingBalance,
        turnoverMd: 10000 + i * 1000,
        turnoverDal: 9000 + i * 800,
        closingBalance: prev311.closingBalance + (1000 + i * 200)
    });
}
