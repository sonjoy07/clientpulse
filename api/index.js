"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_js_1 = require("../src/app.module.js");
const http_exception_filter_js_1 = require("../src/common/filters/http-exception.filter.js");
const security_middleware_js_1 = require("../src/common/middleware/security.middleware.js");
let cachedHandler = null;
async function createServer() {
    const app = await core_1.NestFactory.create(app_module_js_1.AppModule);
    app.setGlobalPrefix('api/v1');
    app.set('trust proxy', 1);
    app.disable('x-powered-by');
    const securityMiddleware = new security_middleware_js_1.SecurityHeadersMiddleware();
    app.use((req, res, next) => securityMiddleware.use(req, res, next));
    app.enableCors({ origin: true, credentials: true });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new http_exception_filter_js_1.HttpExceptionFilter());
    await app.init();
    return app.getHttpAdapter().getInstance();
}
async function handler(req, res) {
    if (!cachedHandler) {
        cachedHandler = await createServer();
    }
    return cachedHandler(req, res);
}
//# sourceMappingURL=index.js.map