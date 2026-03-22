## 🔧 Backend Pull Request Template

### Overview
Briefly describe what changes have been made on the backend.

### Type of Change
- [ ] New API endpoint
- [ ] Bug fix
- [ ] Database schema change
- [ ] Performance improvement
- [ ] Refactoring
- [ ] Security enhancement
- [ ] Other (please specify):

### Code Quality Checklist
- [ ] Code follows the project's coding standards and style guide
- [ ] All TypeScript types are properly defined (no `any` types used)
- [ ] No ESLint errors or warnings
- [ ] No console.log or debugging statements left in code
- [ ] Code is DRY (Don't Repeat Yourself) - no unnecessary duplication
- [ ] Functions and variables have clear, descriptive names
- [ ] Complex logic has explanatory comments
- [ ] Dead/commented-out code has been removed
- [ ] Error handling is comprehensive (try-catch blocks where needed)
- [ ] Proper HTTP status codes are returned (200, 201, 400, 401, 403, 404, 500, etc.)

### API & Documentation Checklist
- [ ] All new/modified API endpoints are documented (Swagger/OpenAPI)
- [ ] Request/response examples are provided in documentation
- [ ] API versioning is maintained (if applicable)
- [ ] Breaking changes are clearly marked and communicated
- [ ] Input validation rules are documented
- [ ] Rate limiting is considered and documented
- [ ] Authentication/authorization requirements are specified

### Database Checklist
- [ ] Database migrations are created (if schema changed)
- [ ] Migrations are reversible (down migration implemented)
- [ ] Indexes are added for frequently queried fields
- [ ] Foreign key constraints are properly defined
- [ ] Database queries are optimized (no N+1 queries)
- [ ] Connection pooling is properly configured
- [ ] Transactions are used for multi-step operations

### Testing Checklist
- [ ] All existing tests pass (`npm test` or equivalent)
- [ ] Unit tests added for new functions/methods (minimum 80% coverage)
- [ ] Integration tests added for new API endpoints
- [ ] Edge cases and error scenarios are tested
- [ ] Database operations are tested (with test database)
- [ ] Mock data is realistic and covers various scenarios
- [ ] Test cleanup properly resets state (no test pollution)
- [ ] Performance tests added for critical endpoints (if applicable)

### Security Checklist
- [ ] Input validation is implemented for all user inputs
- [ ] SQL injection prevention (parameterized queries/ORM used)
- [ ] XSS prevention (output encoding/sanitization)
- [ ] Authentication is required for protected endpoints
- [ ] Authorization checks are in place (role-based access control)
- [ ] Sensitive data is encrypted at rest (passwords, PII, etc.)
- [ ] Secrets and API keys are stored in environment variables (not hardcoded)
- [ ] Password policies are enforced (minimum length, complexity)
- [ ] Rate limiting is implemented to prevent abuse
- [ ] CORS is properly configured (not wildcard in production)
- [ ] Security headers are set (helmet.js or equivalent)
- [ ] JWT tokens have appropriate expiration times
- [ ] Audit logging is implemented for sensitive operations

### HIPAA Compliance Checklist (if handling patient data)
- [ ] Patient data is encrypted in transit (HTTPS/TLS)
- [ ] Patient data is encrypted at rest
- [ ] Access to patient data is logged (audit trail)
- [ ] Only authorized users can access patient data
- [ ] Data retention policies are followed
- [ ] PHI (Protected Health Information) is properly masked in logs

### Performance Checklist
- [ ] Database queries are optimized (EXPLAIN ANALYZE used)
- [ ] Pagination is implemented for large result sets
- [ ] Caching is used where appropriate (Redis, in-memory, etc.)
- [ ] N+1 query problems are avoided
- [ ] Resource cleanup is proper (close connections, streams, etc.)
- [ ] Memory leaks are prevented (no circular references)
- [ ] Background jobs are used for long-running tasks

### Error Handling & Logging
- [ ] All errors are properly caught and handled
- [ ] Error messages are user-friendly (no stack traces to clients)
- [ ] Detailed error information is logged server-side
- [ ] Logging includes request ID for tracing
- [ ] Different log levels are used appropriately (debug, info, warn, error)
- [ ] Sensitive data is NOT logged (passwords, tokens, PII)
- [ ] 500 errors trigger proper alerts/monitoring

### Environment & Configuration
- [ ] New environment variables are documented in .env.example
- [ ] Default values are provided for optional configuration
- [ ] Configuration validation is implemented
- [ ] Backward compatibility is maintained for existing configs
- [ ] Database migrations are tested in staging environment

### Documentation
- [ ] README updated if new setup steps or dependencies added
- [ ] API documentation updated (Swagger/Postman collection)
- [ ] Inline code comments added for complex logic
- [ ] Database schema documentation updated
- [ ] CHANGELOG.md updated with notable changes
- [ ] Migration instructions provided (if applicable)

### How to Test
<!-- Provide detailed step-by-step instructions -->

**Prerequisites:**
<!-- List what needs to be set up before testing -->
1. 
2. 

**Testing Steps:**
1. 
2. 
3. 

**Expected Results:**
<!-- Describe what should happen -->

**Test Cases:**
<!-- List specific test cases and expected outcomes -->
| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
|           |       |                 |

**Postman/cURL Examples:**
<!-- Provide example API requests -->
```bash
curl -X POST http://localhost:3000/api/endpoint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"key": "value"}'
```

### Test Results
<!-- Paste test output showing all tests passing -->
```
# npm test output here
```

### Database Migration Output (if applicable)
<!-- Paste migration output -->
```
# migration output here
```

### Related Issues/PRs
Closes #
Related to #

### Breaking Changes
<!-- List any breaking changes and migration instructions -->
- [ ] No breaking changes
- [ ] Breaking changes (describe below):

### Additional Notes
<!-- Any additional information, context, or concerns -->
