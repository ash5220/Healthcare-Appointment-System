# Healthcare Appointment System — Copilot Instructions

## Project Overview

HIPAA-conscious healthcare appointment system with a monorepo structure:

- **`frontend/`** — Angular 21, TypeScript 5.9, RxJS 7.8, Bootstrap 5.3
- **`backend/`** — Express 5, Sequelize 6, MySQL, Zod, Node.js 22
- **`contracts/`** — Shared TypeScript interfaces (`api-contracts.ts`) used by both frontend and backend
- **Testing** — Backend: Jest 30 + supertest; Frontend: Jasmine 5.13 + Karma + ChromeHeadless
- **Code quality** — ESLint + Prettier (100 char, singleQuote, trailingComma: es5)

All TypeScript configs use full strict mode. Both `tsconfig.json` files enable `strict: true`.

---

## TypeScript (All Code)

- Enable and respect `strict: true` — never use `// @ts-ignore` or `// @ts-nocheck`.
- **Never use `any`**. Use `unknown` when the type is uncertain, then narrow with type guards.
- Prefer type inference when the type is obvious; add explicit types for function signatures and public APIs.
- Use `const` assertions (`as const`) for literal/enum-like objects.
- Use discriminated unions over optional fields when modelling variants.
- Prefer `interface` for object shapes, `type` for unions/intersections/mapped types.
- Use `readonly` for properties that should not be reassigned after initialization.
- Use `Record<K, V>` over `{ [key: string]: V }`.
- Always use `===` (strict equality), never `==`.
- Prefer `const` over `let`. Never use `var`.
- Always `return await` promises in async functions to preserve full stack traces.

---

## Angular 21 — Components

- **Always use standalone components**. Never use NgModules.
- **Do NOT set `standalone: true`** in decorators — it is the default in Angular v20+.
- Use `input()` and `output()` signal functions instead of `@Input()` / `@Output()` decorators.
- Use `model()` for two-way binding.
- Mark `input()`, `output()`, `model()`, and query properties as `readonly`.
- Use `protected` for class members only used by the component template (not part of public API).
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in every `@Component` decorator.
- Use `computed()` for derived state — refactor complex template expressions into `computed()` signals.
- Use the `host` property in `@Component` / `@Directive` instead of `@HostBinding` / `@HostListener`.
- Use `NgOptimizedImage` for all static images (does not work for base64).
- Prefer inline templates for small components (< 20 lines of HTML).
- When using external templates/styles, use paths relative to the component TS file.
- Keep components focused on presentation. Extract business logic into services.
- Implement lifecycle hook interfaces (e.g., `implements OnInit`).
- Keep lifecycle methods simple — delegate to well-named private methods.
- Name event handlers for what they do, not the triggering event (e.g., `saveUser()` not `handleClick()`).
- Use the `app-` selector prefix for all components and directives.

## Angular 21 — Signals & State

- Use `signal()` for local component state.
- Use `computed()` for derived/calculated values.
- Use `update()` or `set()` to modify signals — never use `mutate`.
- Keep state transformations pure and predictable.
- Use RxJS only for async streams (HTTP calls, WebSocket events, complex event composition).
- For simple async operations, prefer signals with `toSignal()` from `@angular/core/rxjs-interop`.

## Angular 21 — Templates

- Use **native control flow**: `@if`, `@for`, `@switch` — never `*ngIf`, `*ngFor`, `*ngSwitch`.
- Use `@for` with a mandatory `track` expression.
- Use `class` bindings instead of `ngClass`; use `style` bindings instead of `ngStyle`.
- Use the `async` pipe to handle observables in templates.
- Keep templates simple — refactor complex logic into `computed()` or class methods.
- Do not assume global objects (like `new Date()`) are available in templates.

## Angular 21 — Dependency Injection & Services

- Use the `inject()` function instead of constructor parameter injection.
- Use `providedIn: 'root'` for singleton services.
- Design services around a single responsibility.
- Group Angular-specific properties (injected deps, inputs, outputs, queries) at the top of the class.

## Angular 21 — Routing

- Implement lazy loading for all feature routes using `loadComponent`.
- Use functional route guards (`CanActivateFn`) and functional interceptors (`HttpInterceptorFn`).
- Use data resolvers where pre-fetching data improves UX.

## Angular 21 — Forms

- Prefer **Reactive Forms** over template-driven forms.
- Use strongly typed form groups (`FormGroup<{...}>`) for type safety.

## Angular 21 — Accessibility

- All components must pass WCAG AA minimums.
- Include proper focus management, color contrast, and ARIA attributes.

---

## Node.js / Express 5 Backend

### Architecture

Follow the layered architecture already in place:

```
Controller → Service → Repository → Model
```

- **Controllers**: Handle HTTP request/response only. Validate input with Zod DTOs via middleware. Never contain business logic.
- **Services**: Contain business logic. May delegate to other services. Never import Express types (`Request`, `Response`).
- **Repositories**: Data access layer. All Sequelize queries live here. Return typed model instances or plain objects.
- **Models**: Sequelize model definitions with `InferAttributes` / `InferCreationAttributes` for type safety.
- Use the existing path aliases: `@config`, `@models`, `@services`, `@controllers`, `@middleware`, `@routes`, `@utils`, `@types`, `@dto`.

### Error Handling

- Use the existing custom `HttpError` classes (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`).
- Throw domain errors from services; let the global error middleware map them to HTTP responses.
- Always `return await` async calls to preserve stack traces.
- Catch unhandled promise rejections — never let promises fail silently.
- Never expose internal error details (stack traces, DB errors) to clients.

### Input Validation

- Validate all request input using **Zod** schemas in `src/dto/`.
- Apply validation via the `validateMiddleware`. Never validate manually in controllers.
- Use `.strict()` on Zod object schemas to reject unknown keys.

### Patterns

- Use `async/await` everywhere — never callbacks.
- Import Node.js built-in modules with the `node:` prefix (e.g., `import { createServer } from 'node:http'`).
- Avoid side effects at module top level — wrap DB/network calls in functions.
- Use `AsyncLocalStorage` or request-scoped context for correlation/transaction IDs.

---

## Sequelize & Database Performance

### Query Optimization

- **Select only needed columns**: Use `attributes: ['id', 'name', ...]` instead of `SELECT *`.
- **Avoid N+1 queries**: Use `include` for eager loading related models. Specify explicit `attributes` on included models too.
- **Paginate with `findAndCountAll`**: Always use `limit` and `offset` for list endpoints. Return total count for frontend pagination.
- **Use `where` conditions efficiently**: Combine conditions in a single `where` object. Use `Op` operators (`Op.and`, `Op.or`, `Op.in`, `Op.between`, etc.) — never interpolate user input into raw SQL.
- **Index hot columns**: Ensure columns used in `WHERE`, `ORDER BY`, and `JOIN` conditions have database indexes. Add indexes in migrations, not model definitions.

### Write Operations

- **Use transactions** for multi-step writes (e.g., creating a user + doctor profile). Use `sequelize.transaction()` with managed transactions (pass `{ transaction: t }` to each query).
- Use `bulkCreate` for batch inserts with `validate: true`.
- Use `paranoid: true` (soft deletes) for models that need audit trails (appointments, medical records).

### Model Definitions

- Use `InferAttributes<Model>` and `InferCreationAttributes<Model>` for type-safe model attributes.
- Use `DataTypes.UUID` with `defaultValue: DataTypes.UUIDV4` for primary keys.
- Use `DataTypes.ENUM` for constrained value fields.
- Define associations in a central `models/index.ts` file with explicit foreign key names.
- Keep model files focused on schema definition — no business logic in models.

### Performance Rules

- Never use `include: { all: true }` or `include: { all: true, nested: true }` — always be explicit.
- Avoid eager loading more than 2 levels deep. If you need deeply nested data, use separate queries.
- Use `raw: true` or `nest: true` for read-only queries that don't need model instances.
- Set `logging: false` in production Sequelize config to avoid query log overhead.
- Use connection pool settings appropriate for the environment (already configured: 5 dev, configurable prod).

---

## Security (HIPAA-Aware)

- **PHI Audit Logging**: Any endpoint that reads or writes Protected Health Information (PHI) must trigger the `phiAuditMiddleware`. Log resource type, action, outcome, user, and IP.
- **Never log PHI/PII** (patient names, SSNs, medical data) to application logs or console.
- **Authentication**: JWT access tokens (short-lived, in-memory) + HttpOnly refresh cookies. Use refresh token rotation.
- **Password security**: bcrypt hashing, 8-72 chars, complexity requirements, rate-limited login attempts with account lockout.
- **Input sanitization**: Apply `sanitizeMiddleware` to all routes accepting user input.
- **Rate limiting**: Apply `rateLimitMiddleware` to authentication and sensitive endpoints.
- **Headers**: Helmet.js is already configured — do not disable or weaken CSP, HSTS, or other security headers.
- **CORS**: Use explicit origin whitelist. Never use `origin: '*'` or `origin: true`.
- **Secrets**: Never hardcode secrets. Use environment variables via `@config`. Never commit `.env` files.

---

## Testing

### General

- **Structure**: Arrange → Act → Assert (AAA pattern).
- **Naming**: Test names must include 3 parts: `[unit under test] — [scenario] — [expected result]`.
- **Coverage**: Maintain minimum 80% coverage for branches, functions, lines, and statements.
- **Isolation**: Each test manages its own data. No shared mutable state between tests.
- **Mock external services**: HTTP calls, email services, and third-party APIs must be mocked.
- **Every testable unit must cover three categories of scenarios**:
  - **Happy path**: valid input, expected success outcome.
  - **Edge cases**: boundary values, empty collections, null/undefined inputs, maximum lengths, concurrent operations.
  - **Error cases**: invalid input, missing required fields, unauthorized access, service failures, network errors, constraint violations.

### Backend (Jest + supertest)

- Unit tests in `src/tests/unit/`, integration tests in `src/tests/integration/`.
- Mock repositories when testing services. Mock services when testing controllers.
- Use `supertest` for integration tests against the Express app.
- Use `jest.spyOn()` for mocking — avoid manual mock implementations unless necessary.
- Run with `--detectOpenHandles` to catch leaked async resources.

### Frontend (Jasmine + Karma)

- Test files co-located with source: `component.spec.ts` next to `component.ts`.
- Use `TestBed` for component/service testing.
- Use `HttpTestingController` for mocking HTTP calls.
- Use `jasmine.createSpyObj()` for service mocks.
- Test both happy paths and error scenarios.

---

## Code Style & Conventions

- **Prettier**: 100 char line width, single quotes, ES5 trailing commas, 2-space indent.
- **File naming**: Hyphenated lowercase (`user-profile.ts`, `user-profile.spec.ts`, `user-profile.html`).
- **Exports**: Use barrel files (`index.ts`) for public module exports.
- **Naming**:
  - `camelCase` for variables, properties, functions.
  - `PascalCase` for classes, interfaces, type aliases, enums.
  - `UPPER_SNAKE_CASE` for global constants and static class properties.
- **Imports**: ESM imports throughout. Group: 1) Node built-ins, 2) Third-party, 3) Internal aliases, 4) Relative.
- **Comments**: JSDoc for public APIs. Inline comments explain *why*, not *what*.

---

## API Contracts

- Shared request/response types live in `contracts/api-contracts.ts`.
- Keep frontend and backend in sync — run `npm run sync-contracts` after changes.
- All API responses follow a consistent shape:
  ```ts
  { success: boolean; data: T; metadata?: PaginationMeta; message?: string }
  ```
- The CI pipeline includes a contract drift check that fails if contracts are out of sync.

---

## Build & Run

- **Backend dev**: `cd backend && npm run dev` (ts-node-dev with hot reload)
- **Frontend dev**: `cd frontend && npm start` (ng serve on port 4200)
- **Backend tests**: `cd backend && npm test`
- **Frontend tests**: `cd frontend && npm run test -- --watch=false --browsers=ChromeHeadless`
- **Lint both**: `npm run lint` in each directory
- **Migrations**: `cd backend && npm run migrate`
- **Full check**: Use VS Code task `Project: Check All` to lint + test everything
