const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { synchronizeCompanyData } = require('./sync-logic');

admin.initializeApp();
const db = admin.firestore();
const secretManager = new SecretManagerServiceClient();

// --- Helper Functions ---
async function accessSecretVersion(secretName) {
    const [version] = await secretManager.accessSecretVersion({
        name: `projects/${process.env.GCLOUD_PROJECT}/secrets/${secretName}/versions/latest`,
    });
    return version.payload.data.toString('utf8');
}

async function setSecretVersion(secretName, payload) {
    // Check if secret exists, create if not
    try {
        await secretManager.getSecret({ name: `projects/${process.env.GCLOUD_PROJECT}/secrets/${secretName}` });
    } catch (error) {
        if (error.code === 5) { // NOT_FOUND
            await secretManager.createSecret({
                parent: `projects/${process.env.GCLOUD_PROJECT}`,
                secretId: secretName,
                secret: { replication: { automatic: {} } },
            });
        } else {
            throw error;
        }
    }
    // Add new version
    await secretManager.addSecretVersion({
        parent: `projects/${process.env.GCLOUD_PROJECT}/secrets/${secretName}`,
        payload: {
            data: Buffer.from(payload, 'utf8'),
        },
    });
}

// --- Callable Functions (triggered from the app) ---

exports.listUsers = onCall(async (request) => {
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

exports.setUserRole = onCall(async (request) => {
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
        // Also update the role in Firestore for consistency
        await db.collection('users').doc(user.uid).set({ email: user.email, role: role }, { merge: true });
        return { success: true, message: `Role for ${email} has been set to ${role}.` };
    } catch (error) {
        logger.error("Error setting user role:", error);
        throw new HttpsError('internal', 'Failed to set user role.');
    }
});


exports.setAbraFlexiSecret = onCall(async (request) => {
    if (!request.auth || request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'Must be an admin to perform this action.');
    }
    const { companyId, password } = request.data;
    if (!companyId || !password) {
        throw new HttpsError('invalid-argument', 'Missing companyId or password.');
    }
    const secretName = `abraflexi-password-${companyId}`;
    await setSecretVersion(secretName, password);
    return { success: true };
});


exports.runCompanySync = onCall(async (request) => {
    if (!request.auth || request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'Must be an admin to perform this action.');
    }
    const { companyId } = request.data;
    if (!companyId) {
        throw new HttpsError('invalid-argument', 'Missing companyId.');
    }

    logger.info(`Manual sync triggered for company: ${companyId}`);
    const companyRef = db.collection('companies').doc(companyId);
    const companySnap = await companyRef.get();

    if (!companySnap.exists) {
        throw new HttpsError('not-found', 'Company not found.');
    }

    try {
        const companyData = companySnap.data();
        const secretName = `abraflexi-password-${companyId}`;
        const password = await accessSecretVersion(secretName);
        
        const financialData = await synchronizeCompanyData(companyData, password);
        
        await companyRef.collection('financial_data').doc('latest').set(financialData);
        
        logger.info(`Successfully synced data for company: ${companyId}`);
        return { success: true, message: `Sync for ${companyData.name} complete.` };
    } catch (error) {
        logger.error(`Error syncing company ${companyId}:`, error);
        throw new HttpsError('internal', 'Failed to synchronize company data.', error.message);
    }
});


// --- Scheduled Functions (runs automatically) ---

exports.runAllCompaniesSync = onSchedule("every 24 hours", async (event) => {
    logger.info("Starting scheduled sync for all companies.");
    const companiesSnapshot = await db.collection('companies').get();
    
    const syncPromises = [];

    companiesSnapshot.forEach(doc => {
        const companyId = doc.id;
        const companyData = doc.data();
        // Skip companies without API credentials
        if (!companyData.abraflexiUrl || !companyData.abraflexiUser) {
            return;
        }

        const promise = exports.runCompanySync({ data: { companyId }, auth: { token: { admin: true } } }) // Simulate admin auth for internal call
            .catch(err => logger.error(`Scheduled sync failed for ${companyId}:`, err));
        syncPromises.push(promise);
    });

    await Promise.all(syncPromises);
    logger.info("Finished scheduled sync for all companies.");
});
