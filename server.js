import jsonServer from 'json-server';
import auth from 'json-server-auth';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcryptjs';

const server = jsonServer.create();
const router = jsonServer.router(path.join(process.cwd(), 'db.json'));
// Disable default CORS so we can use our own permissive one
const middlewares = jsonServer.defaults({ noCors: true });

// Bind the router db to the app
server.db = router.db;

// 1. CORS - Critical for frontend access
server.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
console.log('🔓 CORS Enabled for ALL origins (*)');

// Pre-flight requests
server.options('*', cors());

// 1.5 Health Check Endpoint (Bypasses auth/db)
server.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), message: 'Server is running 🚀' });
});

// 2. Body Parser
server.use(jsonServer.bodyParser);

// 3. Custom Middleware for Logging
server.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        console.log('Body:', JSON.stringify(req.body));
    }
    next();
});

// 4. API Prefix Rewrites (Manual)
server.use(jsonServer.rewriter({
    '/api/auth/login': '/login',
    '/api/auth/register': '/register',
    '/api/auth/profile': '/600/users/1', // 600 means protected
    '/api/products': '/products',
    '/api/products/:id': '/products/:id',
    '/api/orders': '/orders',
    '/api/orders/:id': '/orders/:id',
    '/api/orders/myorders': '/orders', // Filter handled by query params in frontend
    '/api/upload': '/uploads'
}));

// 🚨 EMERGENCY BACKDOOR: Public endpoint to reset Admin Password
// Must be BEFORE auth middleware
server.post('/reset-super-admin', async (req, res) => {
    try {
        const superAdminEmail = 'Abdellah@cosmutics.com';
        const password = '123456789';

        const db = router.db;

        // Safety: Ensure 'users' collection exists
        if (!db.has('users').value()) {
            console.log("⚠️ 'users' collection missing. Creating...");
            db.set('users', []).write();
        }

        const users = db.get('users').value();

        // 1. Delete if exists
        // Check if users is actually an array (Paranoia check)
        if (Array.isArray(users)) {
            const existing = users.find(u => u.email === superAdminEmail);
            if (existing) {
                console.log("⚠️ [Manual Reset] Removing existing admin...");
                db.get('users').remove({ email: superAdminEmail }).write();
            }
        } else {
            // Should not happen if we just set it, but good safety
            console.log("⚠️ 'users' is not an array. Resetting...");
            db.set('users', []).write();
        }

        // 2. Register Fresh via Internal API Loopback
        // We do this to ensure `json-server-auth` hashes the password
        console.log("📝 [Manual Reset] Registering fresh admin...");
        const fetch = (await import('node-fetch')).default || global.fetch;
        // Use localhost with explicit port fallback
        const appPort = process.env.PORT || 5000;
        const registerUrl = `http://localhost:${appPort}/register`;

        console.log(`🔗 Loopback URL: ${registerUrl}`);

        const regRes = await fetch(registerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: superAdminEmail,
                password: password,
                name: 'Abdellah Taha',
                role: 'admin',
                phone: '01000000000'
            })
        });

        if (regRes.ok) {
            console.log("✅ [Manual Reset] Success!");
            res.json({ success: true, message: "Admin reset to 123456789" });
        } else {
            const txt = await regRes.text();
            console.error("❌ Register failed:", txt);
            res.status(500).json({ success: false, error: "Register Failed: " + txt });
        }
    } catch (e) {
        console.error("❌ [Manual Reset] Failed:", e);
        res.status(500).json({ error: e.message });
    }
});

// 5. Auth Middleware
server.use(auth);

// 6. Router
// 6. Router
server.use(router);

// ------------------------------------------
// DATABASE SEEDING (Ensure Super Admin Exists)
// ------------------------------------------
const seedDatabase = () => {
    const db = router.db;

    // Safety: Ensure 'users' collection exists
    if (!db.has('users').value()) {
        db.set('users', []).write();
    }

    const users = db.get('users').value();
    const superAdminEmail = 'Abdellah@cosmutics.com';
    const existingAdmin = users.find(u => u.email === superAdminEmail);

    if (!existingAdmin) {
        console.log('🌱 Seeding database with Super Admin...');

        // Generate secure hash synchronously
        const hashedPassword = bcrypt.hashSync('123456789', 8);

        db.get('users').push({
            id: 1,
            email: superAdminEmail,
            password: hashedPassword,
            name: 'Abdellah Taha',
            role: 'admin',
            phone: '01000000000'
        }).write();

        console.log('✅ Super Admin created: Abdellah@cosmutics.com / 123456789');
    } else {
        console.log('✅ Super Admin already exists.');
    }
};

// Run seed
seedDatabase();


const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    console.log(`✅ Custom JSON Server is running on port ${PORT}`);
    console.log(`Protected routes enabled.`);
});
