import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import admin from "firebase-admin";
import { synchronizeCompanyData, processRawData } from './sync-logic.js'; // Make sure to import processRawData

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
    throw new HttpsError('unimplemented', 'This function is deprecated. Fetch raw data directly.');
});

export const getAccountExplorerData = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    const { companyId } = request.data;
    if (!companyId) throw new HttpsError('invalid-argument', 'Missing companyId.');

    try {
        const dataRef = db.collection('companies').doc(companyId).collection('financial_data').doc('latest');
        const dataSnap = await dataRef.get();
        if (!dataSnap.exists) throw new HttpsError('not-found', 'Financial data not found. Please run a sync.');
        
        const snapData = dataSnap.data();
        const rawData = snapData?.rawData;
        const lastSync = snapData?.lastSync;

        if (!Array.isArray(rawData)) throw new HttpsError('internal', 'Invalid raw data structure in Firestore.');

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
            
        return { accounts, lastSync };
    } catch (error) {
        logger.error(`Error fetching account explorer data for company ${companyId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Failed to process account explorer data.');
    }
});

// =================================================================================
// ADMIN & SYNC FUNCTIONS
// =================================================================================

export const setAbraFlexiSecret = onCall(async (request) => {
    if (!request.auth?.token.admin) throw new HttpsError('permission-denied', 'Must be an admin.');
    const { companyId, password } = request.data;
    if (!companyId || !password) throw new HttpsError('invalid-argument', 'Missing companyId or password.');
    
    try {
        const credentialsRef = db.collection('companies').doc(companyId).collection('abraflexi_credentials').doc('credentials');
        await credentialsRef.set({ password });
        return { success: true, message: 'Password stored successfully.' };
    } catch (error) {
        logger.error(`Error storing password for ${companyId}:`, error);
        throw new HttpsError('internal', 'Failed to store password.');
    }
});

async function syncCompany(companyId) {
    const companyRef = db.collection('companies').doc(companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) throw new HttpsError('not-found', `Company ${companyId} not found.`);

    const credentialsRef = companyRef.collection('abraflexi_credentials').doc('credentials');
    const credentialsSnap = await credentialsRef.get();
    if (!credentialsSnap.exists) throw new HttpsError('not-found', `Password for ${companyId} not set.`);
    
    const password = credentialsSnap.data().password;
    const companyData = companySnap.data();
    const rawData = await synchronizeCompanyData(companyData, password);

    if (!Array.isArray(rawData)) throw new HttpsError('internal', 'Invalid data from AbraFlexi.');

    // Process the data on the server
    const processedData = processRawData(rawData);

    // Save both raw and processed data
    await companyRef.collection('financial_data').doc('latest').set({
        rawData,
        processedData,
        lastSync: new Date().toISOString(),
    });

    logger.info(`Successfully synced data for company: ${companyId}`);
    return { success: true, message: `Sync for ${companyData.name} complete.` };
}

export const runCompanySync = onCall(async (request) => {
    if (!request.auth?.token.admin) throw new HttpsError('permission-denied', 'Must be an admin.');
    const { companyId } = request.data;
    if (!companyId) throw new HttpsError('invalid-argument', 'Missing companyId.');

    logger.info(`Manual sync triggered for company: ${companyId}`);
    try {
        return await syncCompany(companyId);
    } catch (error) {
        logger.error(`Error syncing company ${companyId}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Sync failed.');
    }
});

// =================================================================================
// USER MANAGEMENT FUNCTIONS (RESTORED)
// =================================================================================

export const listUsers = onCall(async (request) => {
    if (!request.auth?.token.admin) {
        throw new HttpsError('permission-denied', 'Must be an admin to list users.');
    }
    try {
        const userRecords = await admin.auth().listUsers();
        return userRecords.users.map(user => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            customClaims: user.customClaims,
            disabled: user.disabled,
        }));
    } catch (error) {
        logger.error('Error listing users:', error);
        throw new HttpsError('internal', 'Failed to list users.');
    }
});

export const setUserRole = onCall(async (request) => {
    if (!request.auth?.token.admin) {
        throw new HttpsError('permission-denied', 'Must be an admin to set user roles.');
    }
    const { uid, roles } = request.data;
    if (!uid || !roles) {
        throw new HttpsError('invalid-argument', 'Missing uid or roles.');
    }
    try {
        await admin.auth().setCustomUserClaims(uid, roles);
        return { success: true, message: `Custom claims for user ${uid} have been updated.` };
    } catch (error) {
        logger.error(`Error setting claims for user ${uid}:`, error);
        throw new HttpsError('internal', 'Failed to set user roles.');
    }
});

export const deleteUser = onCall(async (request) => {
    if (!request.auth?.token.admin) {
        throw new HttpsError('permission-denied', 'Must be an admin to delete a user.');
    }
    const { uid } = request.data;
    if (!uid) {
        throw new HttpsError('invalid-argument', 'Missing user UID.');
    }
    try {
        await admin.auth().deleteUser(uid);
        return { success: true, message: `User ${uid} has been deleted.` };
    } catch (error) {
        logger.error(`Error deleting user ${uid}:`, error);
        throw new HttpsError('internal', 'Failed to delete user.');
    }
});


// =================================================================================
// SCHEDULED FUNCTIONS
// =================================================================================

export const runAllCompaniesSync = onSchedule("every 24 hours", async () => {
    logger.info("Starting scheduled sync for all companies.");
    const companiesSnapshot = await db.collection('companies').get();
    
    for (const doc of companiesSnapshot.docs) {
        const companyId = doc.id;
        try {
            await syncCompany(companyId);
        } catch (err) {
            logger.error(`Scheduled sync failed for ${companyId}:`, err.message);
        }
    }
    logger.info("Finished scheduled sync for all companies.");
});
