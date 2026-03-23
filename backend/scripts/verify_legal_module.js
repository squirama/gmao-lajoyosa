const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { Client } = require('pg');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const AUTH_HEADER = { headers: { 'Authorization': 'Basic YWRtaW46Q0FSRTIwMjUq' } }; // admin:CARE2025*

async function runVerification() {
    console.log("🔍 Starting Legal Module Verification...");
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: process.env.DB_NAME || 'gmao',
        password: process.env.DB_PASSWORD || 'change_me',
        port: 5432,
    });

    try {
        await client.connect();

        // 0. Get Valid Department
        const deptRes = await client.query('SELECT id FROM departments LIMIT 1');
        if (deptRes.rows.length === 0) throw new Error("No departments found in DB!");
        const deptId = deptRes.rows[0].id;
        console.log(`   ✅ Using Dept ID: ${deptId}`);

        // 0.5 Get Valid User (Operator)
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        if (userRes.rows.length === 0) throw new Error("No users found in DB!");
        const userId = userRes.rows[0].id;
        console.log(`   ✅ Using User ID: ${userId}`);

        // 1. Create a Test Asset
        console.log("1️⃣ Creating Test Asset...");
        const assetRes = await axios.post(`${BASE_URL}/admin/assets`, {
            name: 'Legal Test Machine',
            brand: 'TestBrand',
            model: 'TestModel',
            dept_id: deptId
        }, AUTH_HEADER);
        const assetId = assetRes.data.id;
        console.log(`   ✅ Asset Created: ID ${assetId}`);

        // 2. Create a Legal Plan
        console.log("2️⃣ Creating Legal Maintenance Plan...");
        const planRes = await axios.post(`${BASE_URL}/admin/plans`, {
            asset_id: assetId,
            task_description: 'Mandatory Legal Inspection',
            frequency_days: 365,
            is_legal: true,
            start_date: new Date().toISOString().split('T')[0]
        }, AUTH_HEADER);
        const planId = planRes.data.id;

        if (planRes.data.is_legal !== true) throw new Error("is_legal flag not set correctly!");
        console.log(`   ✅ Legal Plan Created: ID ${planId} (is_legal: ${planRes.data.is_legal})`);

        // 3. Verify it appears in Config (Normativa Filter simulation)
        console.log("3️⃣ Verifying Plan Visibility...");
        const configRes = await axios.get(`${BASE_URL}/config`, AUTH_HEADER);
        const plan = configRes.data.plans.find(p => p.id === planId);
        if (!plan || !plan.is_legal) throw new Error("Plan not found or not marked as legal in config");
        console.log("   ✅ Plan found in global config and marked as legal.");

        // 4. Simulate Document Upload
        console.log("4️⃣ Simulating Document Upload...");
        // Create a dummy PDF file
        const dummyPath = path.join(__dirname, 'dummy_cert.pdf');
        fs.writeFileSync(dummyPath, '%PDF-1.4 dummy content');

        const form = new FormData();
        form.append('file', fs.createReadStream(dummyPath));

        const uploadRes = await axios.post(`${BASE_URL}/admin/plans/${planId}/upload`, form, {
            headers: {
                ...AUTH_HEADER.headers,
                ...form.getHeaders()
            }
        });

        if (!uploadRes.data.success || !uploadRes.data.url) throw new Error("Upload failed");
        const docPath = uploadRes.data.url; // e.g., /documents/plan_...
        console.log(`   ✅ Document Uploaded: ${docPath}`);

        // 5. Complete the Plan with Document
        console.log("5️⃣ Completing Plan with Document...");
        await axios.post(`${BASE_URL}/admin/maintenance-plans/${planId}/complete`, {
            operator_id: userId,
            notes: 'Verification Test',
            document_path: docPath
        }, AUTH_HEADER);
        console.log("   ✅ Plan Completed.");

        // 6. Verify History
        console.log("6️⃣ Verifying History Record...");
        const historyRes = await axios.get(`${BASE_URL}/admin/plans/${planId}/history`, AUTH_HEADER);
        const entry = historyRes.data[0];

        if (!entry || entry.document_path !== docPath) throw new Error("History record mismatch or missing document path");
        console.log(`   ✅ History Verified: Date=${entry.performed_date}, Doc=${entry.document_path}`);

        // Cleanup (Optional but good)
        console.log("🧹 Cleaning up...");
        await axios.delete(`${BASE_URL}/admin/plans/${planId}`, AUTH_HEADER);
        await axios.delete(`${BASE_URL}/admin/assets/${assetId}`, AUTH_HEADER);
        fs.unlinkSync(dummyPath);
        // Note: We are not deleting the uploaded file in 'documents' folder to keep it simple, but in prod you might want to.

        console.log("\n🎉 ALL CHECKS PASSED: Legal Module is fully functional!");

    } catch (error) {
        console.error("\n❌ VERIFICATION FAILED:", error.message);
        if (error.response) console.error("   Response Data:", error.response.data);
    } finally {
        await client.end();
    }
}

runVerification();
