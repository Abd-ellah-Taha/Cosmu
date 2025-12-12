import jsonServer from 'json-server';
import auth from 'json-server-auth';
import cors from 'cors';
import path from 'path';

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

// 5. Auth Middleware
server.use(auth);

// 6. Router
server.use(router);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Custom JSON Server is running on port ${PORT}`);
    console.log(`Protected routes enabled.`);
});
