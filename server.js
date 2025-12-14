import jsonServer from 'json-server';
import auth from 'json-server-auth';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults({ noCors: true });

// Bind the router db to the app
server.db = router.db;

// ============================================
// 1. CORS Configuration - MUST be first
// ============================================
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
};

server.use(cors(corsOptions));
server.options('*', cors(corsOptions));

// ============================================
// 2. Body Parser (High Limit for Images)
// ============================================
server.use(bodyParser.json({ limit: '50mb' }));
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
console.log('🔓 CORS Enabled for ALL origins');

// ============================================
// 2. Body Parser (Handled by custom configuration above)
// ============================================
// server.use(jsonServer.bodyParser); // REMOVED to avoid conflict

// ============================================
// 3. Request Logger
// ============================================
server.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        // Don't log passwords
        const logBody = { ...req.body };
        if (logBody.password) logBody.password = '***HIDDEN***';
        console.log('📦 Body:', JSON.stringify(logBody));
    }
    next();
});

// ============================================
// 4. Health Check Endpoint (Before Auth)
// ============================================
server.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Server is running 🚀',
        version: '2.0.0'
    });
});

// ============================================
// 5. API Prefix Rewrites
// ============================================
server.use(jsonServer.rewriter({
    '/api/auth/login': '/login',
    '/api/auth/register': '/register',
    '/api/products': '/products',
    '/api/products/:id': '/products/:id',
    '/api/orders': '/orders',
    '/api/orders/:id': '/orders/:id',
    '/api/categories': '/categories',
    '/api/users': '/users',
    '/api/users/:id': '/users/:id',
    '/auth/login': '/login',
    '/auth/register': '/register'
}));

// ============================================
// 6. Custom Auth Endpoints (Before json-server-auth)
// ============================================

// Custom login with better response format
server.post('/login', (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
        });
    }

    const db = router.db;
    const users = db.get('users').value() || [];
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
        console.log('❌ Login failed: User not found -', email);
        return res.status(401).json({
            success: false,
            message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        });
    }

    // Check password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
        console.log('❌ Login failed: Wrong password for -', email);
        return res.status(401).json({
            success: false,
            message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        });
    }

    // Generate simple token (in production, use proper JWT)
    const token = `token_${user.id}_${Date.now()}`;

    console.log('✅ Login successful:', email);

    return res.json({
        success: true,
        accessToken: token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role || 'customer',
            isAdmin: user.role === 'admin' || user.role === 'manager',
            isSuperAdmin: user.email.toLowerCase() === 'admin@cosmutics.com'
        }
    });
});

// Custom register with better response format
server.post('/register', (req, res, next) => {
    const { email, password, name, phone, role } = req.body;

    // Validation
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
        });
    }

    if (!name || name.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: 'الاسم مطلوب ويجب أن يكون حرفين على الأقل'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
        });
    }

    const db = router.db;
    const users = db.get('users').value() || [];

    // Check if user exists
    const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (existingUser) {
        console.log('❌ Registration failed: Email exists -', email);
        return res.status(400).json({
            success: false,
            message: 'هذا البريد الإلكتروني مسجل بالفعل'
        });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Determine role - only allow admin/manager if created by a Super Admin
    let finalRole = 'customer';
    if (role && role !== 'customer') {
        // Authenticate request to see if it's from Super Admin
        const authHeader = req.headers.authorization;
        let isAuthorized = false;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const parts = authHeader.split(' ')[1].split('_');
                if (parts.length >= 2) {
                    const requesterId = parseInt(parts[1]);
                    const requester = users.find(u => u.id === requesterId);
                    if (requester && requester.email.toLowerCase() === 'admin@cosmutics.com') {
                        isAuthorized = true;
                    }
                }
            } catch (e) {
                console.error('Role auth check failed:', e);
            }
        }

        if (isAuthorized) {
            finalRole = role;
        } else {
            console.warn(`⚠️ Unauthorized role assignment attempt: ${email} wanted ${role}`);
        }
    }

    // Create new user
    const newUser = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id || 0)) + 1 : 1,
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name.trim(),
        phone: phone || '',
        role: finalRole,
        // Initialize other profile fields
        image: '',
        profilePicture: '',
        address: '',
        createdAt: new Date().toISOString()
    };

    // Save to database
    db.get('users').push(newUser).write();

    // Generate token
    const token = `token_${newUser.id}_${Date.now()}`;

    console.log('✅ Registration successful:', email);

    return res.status(201).json({
        success: true,
        accessToken: token,
        user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            phone: newUser.phone,
            role: newUser.role,
            isAdmin: newUser.role === 'admin' || newUser.role === 'manager',
            isSuperAdmin: false
        }
    });
});

// Get current user profile
server.get('/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'غير مصرح' });
    }

    const token = authHeader.split(' ')[1];
    const parts = token.split('_');
    if (parts.length < 2) {
        return res.status(401).json({ message: 'Token غير صالح' });
    }

    const userId = parseInt(parts[1]);
    const db = router.db;
    const user = db.get('users').find({ id: userId }).value();

    if (!user) {
        return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        image: user.image,
        profilePicture: user.profilePicture,
        address: user.address,
        isAdmin: user.role === 'admin' || user.role === 'manager',
        isSuperAdmin: user.email.toLowerCase() === 'admin@cosmutics.com'
    });
});

// Update current user profile
server.patch('/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'غير مصرح' });
    }

    const token = authHeader.split(' ')[1];
    const parts = token.split('_');
    if (parts.length < 2) {
        return res.status(401).json({ message: 'Token غير صالح' });
    }

    const userId = parseInt(parts[1]);
    const db = router.db;
    const user = db.get('users').find({ id: userId }).value();

    if (!user) {
        return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    const updates = req.body;

    // Handle password update securely
    if (updates.password) {
        if (updates.password.length < 6) {
            return res.status(400).json({ message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
        }
        updates.password = bcrypt.hashSync(updates.password, 10);
    } else {
        delete updates.password; // If no password provided, ensure we don't accidentally overwrite with null
    }

    // Don't allow updating formatted ID or Role (role is handled by admin middleware)
    delete updates.id;
    delete updates.role;

    db.get('users')
        .find({ id: userId })
        .assign(updates)
        .write();

    const updatedUser = db.get('users').find({ id: userId }).value();

    res.json({
        success: true,
        user: {
            ...updatedUser,
            isAdmin: updatedUser.role === 'admin' || updatedUser.role === 'manager',
            isSuperAdmin: updatedUser.email.toLowerCase() === 'admin@cosmutics.com'
        }
    });
});

// Middleware to protect admin management routes
server.use((req, res, next) => {
    // Only intercept writes to users collection if attempting to modify roles/admins
    if ((req.method === 'POST' || req.method === 'DELETE' || req.method === 'PUT' || req.method === 'PATCH') &&
        req.path.includes('/users')) {

        const authHeader = req.headers.authorization;
        if (!authHeader) return next(); // json-server-auth will handle public logic if any

        try {
            const token = authHeader.split(' ')[1];
            const userId = parseInt(token.split('_')[1]);
            const db = router.db;
            const requestUser = db.get('users').find({ id: userId }).value();

            // Check if Super Admin
            const isSuperAdmin = requestUser?.email?.toLowerCase() === 'admin@cosmutics.com';

            // If deleting a user, must be super admin
            if (req.method === 'DELETE' && !isSuperAdmin) {
                return res.status(403).json({ message: 'فقط المدير العام يمكنه حذف المستخدمين' });
            }

            // If modifying role, must be super admin
            if (req.body && req.body.role && req.body.role !== 'customer' && !isSuperAdmin) {
                return res.status(403).json({ message: 'فقط المدير العام يمكنه تعيين أدوار إدارية' });
            }
        } catch (e) {
            console.error('Middleware check failed:', e);
        }
    }
    next();
});

// Reset super admin endpoint (for emergencies)
server.post('/reset-super-admin', (req, res) => {
    try {
        const db = router.db;
        const superAdminEmail = 'admin@cosmutics.com';
        const password = '123456789';

        // Remove existing admin if exists
        db.get('users').remove({ email: superAdminEmail }).write();

        // Create new admin with hashed password
        const hashedPassword = bcrypt.hashSync(password, 10);

        const adminUser = {
            id: 1,
            email: superAdminEmail,
            password: hashedPassword,
            name: 'Abdellah Taha',
            phone: '01000000000',
            role: 'admin',
            createdAt: new Date().toISOString()
        };

        db.get('users').push(adminUser).write();

        console.log('✅ Super Admin reset successfully');
        res.json({
            success: true,
            message: 'تم إعادة تعيين حساب المدير بنجاح',
            credentials: { email: superAdminEmail, password: password }
        });
    } catch (error) {
        console.error('❌ Reset failed:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// 7. Use default middlewares (static files, etc)
// ============================================
server.use(middlewares);

// ============================================
// 8. Router (handles all other requests)
// ============================================
server.use(router);

// ============================================
// 9. Error Handler
// ============================================
server.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'حدث خطأ في السيرفر',
        error: err.message
    });
});

// ============================================
// DATABASE SEEDING
// ============================================
const seedDatabase = () => {
    const db = router.db;

    // Ensure users collection exists
    if (!db.has('users').value()) {
        db.set('users', []).write();
    }

    // Ensure other collections exist
    if (!db.has('products').value()) {
        db.set('products', []).write();
    }
    if (!db.has('orders').value()) {
        db.set('orders', []).write();
    }
    if (!db.has('categories').value()) {
        db.set('categories', []).write();
    }

    // Check for super admin
    const users = db.get('users').value();
    const superAdminEmail = 'admin@cosmutics.com';
    const existingAdmin = users.find(u => u.email === superAdminEmail);

    if (!existingAdmin) {
        console.log('🌱 Seeding Super Admin...');

        const hashedPassword = bcrypt.hashSync('123456789', 10);

        db.get('users').push({
            id: 1,
            email: superAdminEmail,
            password: hashedPassword,
            name: 'Abdellah Taha',
            phone: '01000000000',
            role: 'admin',
            createdAt: new Date().toISOString()
        }).write();

        console.log('✅ Super Admin created: admin@cosmutics.com / 123456789');
    } else {
        console.log('✅ Super Admin exists');
    }
};

// Run seed
seedDatabase();

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║     🚀 Sobhi Cosmetics API Server          ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║  🌐 Running on: http://localhost:${PORT}      ║`);
    console.log('║  📦 Database: db.json                      ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
    console.log('📍 Available Endpoints:');
    console.log('   POST /login          - User login');
    console.log('   POST /register       - User registration');
    console.log('   GET  /profile        - Get user profile');
    console.log('   GET  /products       - Get all products');
    console.log('   GET  /orders         - Get all orders');
    console.log('   GET  /users          - Get all users (admin)');
    console.log('   GET  /health         - Health check');
    console.log('   POST /reset-super-admin - Reset admin');
    console.log('');
});
