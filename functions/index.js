import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import admin from "firebase-admin";
import { synchronizeCompanyData, processRawData } from './sync-logic.js'; // Assuming processRawData is exported

// --- INITIALIZATION ---
admin.initializeApp();
const db = admin.firestore();

// --- CALLABLE FUNCTIONS ---

/**
 * Stores the AbraFlexi password in a secure, server-only sub-collection.
 */
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

/**
 * Runs the data synchronization for a specific company.
 */
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

        // Save raw data
        await companyRef.collection('financial_data').doc('raw_latest').set({
            rawData,
            lastSync: new Date().toISOString(),
        });

        // Process and save structured data
        const processedData = processRawData(rawData['winstrom']?.['stav-uctu'] || []);
        await companyRef.collection('financial_data').doc('latest').set({
            ...processedData,
            lastSync: new Date().toISOString(),
        });

        logger.info(`Successfully synced data for company: ${companyId}`);
        return { success: true, message: `Sync for ${companyData.name} complete.` };

    } catch (error) {
        logger.error(`Error syncing company ${companyId}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message || 'Failed to synchronize company data.');
    }
});


// --- Other Functions (Unchanged) ---
export const listUsers = onCall(async (request) => {
    if (!request.auth || request.auth.token.admin !== true) {
      throw new HttpsError('permission-denied', 'Must be an admin to list users.');
    }
    try {
        const userRecords = await admin.auth().listUsers(1000);
        const users = userRecords.users.map((user) => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: user.customClaims?.role || 'viewer',
        }));
        return { users };
    } catch (error) {
        logger.error("Error listing users:", error);
        throw new HttpsError('internal', 'Failed to list users.');
    }
});

export const setUserRole = onCall(async (request) => {
    if (!request.auth || request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'Must be an admin to set roles.');
    }
    const { email, role } = request.data;
    if (!email || !role) {
        throw new HttpsError('invalid-argument', 'Missing email or role.');
    }
    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, { role: role, admin: role === 'admin' });
        await db.collection('users').doc(user.uid).set({ email: user.email, role: role }, { merge: true });
        return { success: true, message: `Role for ${email} has been set to ${role}.` };
    } catch (error) {
        logger.error("Error setting user role:", error);
        throw new HttpsError('internal', 'Failed to set user role.');
    }
});

export const deleteUser = onCall(async (request) => {
    if (!request.auth || request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'Must be an admin to delete users.');
    }
    const { uid } = request.data;
    if (!uid) {
        throw new HttpsError('invalid-argument', 'Missing user ID.');
    }
    try {
        await admin.auth().deleteUser(uid);
        await db.collection('users').doc(uid).delete();
        await db.collection('permissions').doc(uid).delete();
        return { success: true, message: `User ${uid} has been deleted.` };
    } catch (error) {
        logger.error(`Error deleting user ${uid}:`, error);
        throw new HttpsError('internal', 'Failed to delete user.');
    }
});

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
             if (!credentialsSnap.exists()) {
                logger.warn(`Skipping sync for ${companyId}, missing password.`);
                continue;
             }
             const password = credentialsSnap.data().password;
             const rawData = await synchronizeCompanyData(companyData, password);
             
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
