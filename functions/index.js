import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import admin from "firebase-admin";
import { synchronizeCompanyData, processRawData } from './sync-logic.js';

// --- INITIALIZATION ---
admin.initializeApp();
const db = admin.firestore();

const parseNumber = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

// =================================================================================
// DATA-FETCHING FUNCTIONS
// =================================================================================

export const getManagerialData = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { companyId } = request.data;
    if (!companyId) {
        throw new HttpsError('invalid-argument', 'Missing companyId.');
    }
    try {
        const processedDataRef = db.collection('companies').doc(companyId).collection('financial_data').doc('latest');
        const docSnap = await processedDataRef.get();
        if (!docSnap.exists) {
            throw new HttpsError('not-found', 'Processed financial data not found. Please run a sync first.');
        }
        return docSnap.data();
    } catch (error) {
         logger.error(`Error fetching managerial data for company ${companyId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to fetch managerial data.');
    }
});


export const getAccountExplorerData = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { companyId } = request.data;
    if (!companyId) {
        throw new HttpsError('invalid-argument', 'Missing companyId.');
    }

    try {
        const rawDataRef = db.collection('companies').doc(companyId).collection('financial_data').doc('raw_latest');
        const rawDataSnap = await rawDataRef.get();

        if (!rawDataSnap.exists) {
            throw new HttpsError('not-found', 'Raw financial data not found for this company.');
        }
        
        const snapData = rawDataSnap.data();
        const rawData = snapData?.rawData?.winstrom?.['stav-uctu'];
        const lastSync = snapData?.lastSync; // <-- GET THE TIMESTAMP

        if (!Array.isArray(rawData)) {
             throw new HttpsError('internal', 'Invalid raw data structure in Firestore.');
        }

        const accounts = rawData
            .filter(row => row.mena === 'code:EUR')
            .map(row => {
                const monthlyDetails = Array.from({ length: 12 }, (_, i) => {
                    const monthKey = String(i + 1).padStart(2, '0');
                    return {
                        month: i + 1,
                        turnoverMd: parseNumber(row[`obratMd${monthKey}`]),
                        turnoverDal: parseNumber(row[`obratDal${monthKey}`]),
                        closingBalance: parseNumber(row[`stav${monthKey}`]),
                    };
                });

                return {
                    accountNumber: String(row.ucet?.replace('code:', '') || ''),
                    accountName: row.nazevUctu || 'Neznámy názov',
                    openingBalanceYear: parseNumber(row.pocatek),
                    monthlyDetails: monthlyDetails,
                };
            });
            
        return { accounts, lastSync }; // <-- RETURN THE TIMESTAMP

    } catch (error) {
        logger.error(`Error fetching account explorer data for company ${companyId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to process account explorer data.');
    }
});


// --- ADMIN & SYNC FUNCTIONS ---

export const setAbraFlexiSecret = onCall(async (request) => {
    if (!request.auth || !request.auth.token.admin) {
        throw new HttpsError('permission-denied', 'Must be an admin to perform this action.');
    }
    const { companyId, password } = request.data;
    if (!companyId || !password) {
        throw new HttpsError('invalid-argument', 'Missing companyId or password.');
    }
    try {
        const credentialsRef = db.collection('companies').doc(companyId).collection('abraflexi_credentials').doc('credentials');
        await credentialsRef.set({ password });
        return { success: true, message: 'Password stored successfully.' };
    } catch (error) {
        logger.error(`Error storing password for company ${companyId}:`, error);
        throw new HttpsError('internal', 'Failed to store the password in Firestore.');
    }
});

export const runCompanySync = onCall(async (request) => {
    if (!request.auth || !request.auth.token.admin) {
        throw new HttpsError('permission-denied', 'Must be an admin to perform this action.');
    }
    const { companyId } = request.data;
    if (!companyId) {
        throw new HttpsError('invalid-argument', 'Missing companyId.');
    }

    logger.info(`Manual sync triggered for company: ${companyId}`);
    const companyRef = db.collection('companies').doc(companyId);

    try {
        const companySnap = await companyRef.get();
        if (!companySnap.exists) { 
            throw new HttpsError('not-found', 'Company not found.');
        }

        const credentialsRef = companyRef.collection('abraflexi_credentials').doc('credentials');
        const credentialsSnap = await credentialsRef.get();
        if (!credentialsSnap.exists) { 
            throw new HttpsError('not-found', 'Password for this company is not set.');
        }
        const password = credentialsSnap.data().password;

        const companyData = companySnap.data();
        const rawData = await synchronizeCompanyData(companyData, password);

        if (!rawData || typeof rawData !== 'object') {
            throw new HttpsError('internal', 'Received invalid or empty data from AbraFlexi API. Cannot process.');
        }

        await companyRef.collection('financial_data').doc('raw_latest').set({
            rawData,
            lastSync: new Date().toISOString(),
        });

        const processedData = processRawData(rawData['winstrom']?.['stav-uctu'] || []);
        await companyRef.collection('financial_data').doc('latest').set({
            ...processedData,
            lastSync: new Date().toISOString(),
        });

        logger.info(`Successfully synced data for company: ${companyId}`);
        return { success: true, message: `Sync for ${companyData.name} complete.` };

    } catch (error) {
        logger.error(`Error syncing company ${companyId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Failed to synchronize company data.');
    }
});

export const listUsers = onCall(async (request) => { /* ... */ });
export const setUserRole = onCall(async (request) => { /* ... */ });
export const deleteUser = onCall(async (request) => { /* ... */ });

// --- SCHEDULED FUNCTIONS ---
export const runAllCompaniesSync = onSchedule("every 24 hours", async () => {
    logger.info("Starting scheduled sync for all companies.");
    const companiesSnapshot = await db.collection('companies').get();
    
    for (const doc of companiesSnapshot.docs) {
        const companyId = doc.id;
        try {
            const companySnap = await db.collection('companies').doc(companyId).get();
            if(!companySnap.exists) continue;
            const companyData = companySnap.data();

            if (!companyData.abraflexiUrl || !companyData.abraflexiUser) {
                logger.warn(`Skipping sync for ${companyId}, missing credentials.`);
                continue;
            }
             const credentialsRef = db.collection('companies').doc(companyId).collection('abraflexi_credentials').doc('credentials');
             const credentialsSnap = await credentialsRef.get();
             if (!credentialsSnap.exists) {
                logger.warn(`Skipping sync for ${companyId}, missing password.`);
                continue;
             }
             const password = credentialsSnap.data().password;
             const rawData = await synchronizeCompanyData(companyData, password);
             
             if (!rawData || typeof rawData !== 'object') {
                logger.error(`Scheduled sync for ${companyId} failed: Received invalid data from AbraFlexi.`);
                continue;
             }
             await db.collection('companies').doc(companyId).collection('financial_data').doc('raw_latest').set({
                rawData,
                lastSync: new Date().toISOString(),
            });
            const processedData = processRawData(rawData['winstrom']?.['stav-uctu'] || []);
            await db.collection('companies').doc(companyId).collection('financial_data').doc('latest').set({
                ...processedData,
                lastSync: new Date().toISOString(),
            });
             logger.info(`Scheduled sync successful for ${companyId}`);
        } catch (err) {
            logger.error(`Scheduled sync failed for ${companyId}:`, err);
        }
    }
    logger.info("Finished scheduled sync for all companies.");
});
