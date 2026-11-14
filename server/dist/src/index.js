"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const auth_js_1 = require("./auth.js");
const session_js_1 = require("./session.js");
const students_js_1 = require("./students.js");
const admin_extras_js_1 = require("./admin-extras.js");
const parent_js_1 = require("./parent.js");
const results_js_1 = require("./results.js");
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), "..", ".env") });
// Fail at boot, not at the first login, if the session secret is missing or weak.
(0, session_js_1.assertSessionConfig)();
const app = (0, express_1.default)();
const port = Number(process.env.PORT ?? 4000);
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((0, helmet_1.default)({
    // This server only returns JSON, so helmet's default CSP is safe to leave on.
    crossOriginResourcePolicy: false,
}));
app.use((0, auth_js_1.createCorsMiddleware)());
app.use(express_1.default.json({ limit: "3mb" }));
app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "school-results-portal-api" });
});
app.get("/api", (_req, res) => {
    res.json({ message: "API ready." });
});
app.use((0, auth_js_1.createAuthApp)());
app.use("/api/admin", (0, students_js_1.createAdminRouter)());
app.use("/api/admin", (0, results_js_1.createResultsRouter)());
app.use("/api/admin", (0, admin_extras_js_1.createExtrasRouter)());
app.use("/api/parent", (0, parent_js_1.createParentRouter)());
app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not found" });
});
// Must be last: turns any thrown/rejected error into a logged 500 instead of a hung request.
app.use(session_js_1.errorHandler);
// Vercel imports the Express app as a function. Keep the listener for local
// development, where the server is started with `npm run dev` or `npm start`.
if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}
exports.default = app;
