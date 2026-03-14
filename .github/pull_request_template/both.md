## 🔄 Full Stack (Frontend & Backend) Pull Request Template

### Overview
Briefly describe what has been changed on both frontend and backend and how they work together.

### Type of Change
- [ ] New feature (frontend + backend)
- [ ] Bug fix (affecting both layers)
- [ ] UI/UX improvement with API changes
- [ ] Refactoring across stack
- [ ] Performance improvement
- [ ] Other (please specify):

## Frontend Changes

### Frontend Code Quality Checklist
- [ ] Code follows the project's coding standards and style guide
- [ ] All TypeScript types are properly defined (no `any` types used)
- [ ] No ESLint errors or warnings
- [ ] No console.log or debugging statements left in code
- [ ] Code is DRY (Don't Repeat Yourself) - no unnecessary duplication
- [ ] Functions and variables have clear, descriptive names

### Frontend UI/UX Checklist
- [ ] UI changes match the design specifications/mockups exactly
- [ ] All interactive elements have appropriate hover/focus/active states
- [ ] Loading states are implemented for asynchronous operations
- [ ] Error states and error messages are user-friendly and helpful
- [ ] Empty states are handled appropriately
- [ ] Form validation provides clear, real-time feedback

### Frontend Responsiveness & Accessibility
- [ ] Tested on mobile devices (320px to 480px)
- [ ] Tested on tablets (768px to 1024px)
- [ ] Tested on desktop (1280px and above)
- [ ] All images have appropriate alt text
- [ ] Keyboard navigation works properly
- [ ] Screen reader compatible or ARIA labels added

### Frontend Testing
- [ ] All existing frontend tests pass
- [ ] New unit tests added for new components (minimum 80% coverage)
- [ ] Component tests include edge cases and error scenarios
- [ ] Cross-browser testing done (Chrome, Firefox, Safari, Edge)

### Frontend Security
- [ ] User input is properly sanitized to prevent XSS attacks
- [ ] Sensitive data is not logged or exposed
- [ ] API keys are not hardcoded in the frontend
- [ ] Authentication tokens are stored securely

## Backend Changes

### Backend Code Quality Checklist
- [ ] Code follows the project's coding standards and style guide
- [ ] All TypeScript types are properly defined (no `any` types used)
- [ ] No ESLint errors or warnings
- [ ] No console.log or debugging statements left in code
- [ ] Error handling is comprehensive (try-catch blocks where needed)
- [ ] Proper HTTP status codes are returned

### Backend API & Documentation Checklist
- [ ] All new/modified API endpoints are documented (Swagger/OpenAPI)
- [ ] Request/response examples are provided
- [ ] Input validation rules are documented
- [ ] Authentication/authorization requirements are specified

### Backend Database Checklist
- [ ] Database migrations are created (if schema changed)
- [ ] Migrations are reversible (down migration implemented)
- [ ] Indexes are added for frequently queried fields
- [ ] Database queries are optimized (no N+1 queries)
- [ ] Transactions are used for multi-step operations

### Backend Testing
- [ ] All existing backend tests pass
- [ ] Unit tests added for new functions/methods (minimum 80% coverage)
- [ ] Integration tests added for new API endpoints
- [ ] Edge cases and error scenarios are tested
- [ ] Database operations are tested (with test database)

### Backend Security Checklist
- [ ] Input validation is implemented for all user inputs
- [ ] SQL injection prevention (parameterized queries/ORM used)
- [ ] XSS prevention (output encoding/sanitization)
- [ ] Authentication is required for protected endpoints
- [ ] Authorization checks are in place (role-based access control)
- [ ] Sensitive data is encrypted at rest (passwords, PII, etc.)
- [ ] Secrets and API keys are stored in environment variables
- [ ] Rate limiting is implemented to prevent abuse
- [ ] CORS is properly configured
- [ ] Security headers are set (helmet.js or equivalent)
- [ ] JWT tokens have appropriate expiration times
- [ ] Audit logging implemented for sensitive operations

### Backend HIPAA Compliance (if handling patient data)
- [ ] Patient data is encrypted in transit (HTTPS/TLS)
- [ ] Patient data is encrypted at rest
- [ ] Access to patient data is logged (audit trail)
- [ ] Only authorized users can access patient data
- [ ] PHI is properly masked in logs

### Backend Performance
- [ ] Database queries are optimized (EXPLAIN ANALYZE used)
- [ ] Pagination is implemented for large result sets
- [ ] Caching is used where appropriate
- [ ] N+1 query problems are avoided
- [ ] Background jobs are used for long-running tasks

## Integration Testing

### End-to-End Testing Checklist
- [ ] User flow works from UI to database and back
- [ ] API integration is working correctly (frontend calls backend successfully)
- [ ] Error handling works across the stack (backend errors display properly in UI)
- [ ] Loading states work correctly during API calls
- [ ] Authentication flow works end-to-end (login, token refresh, logout)
- [ ] Authorization is enforced (unauthorized users cannot access protected features)
- [ ] Data validation works on both frontend and backend
- [ ] Success/error messages are consistent between layers

### Test Scenarios
<!-- Provide detailed test scenarios that cover the full stack -->

**Scenario 1:** <!-- e.g., User Registration -->
1. **Frontend:** User fills registration form
2. **Backend:** Validates input, creates user, sends confirmation email
3. **Frontend:** Displays success message
4. **Expected:** User account created and confirmation email sent

**Scenario 2:** <!-- Add more scenarios -->
1. 
2. 
3. 
4. 

### How to Test

**Prerequisites:**
<!-- List what needs to be set up before testing -->
1. Backend server running on `http://localhost:3000`
2. Frontend app running on `http://localhost:4200`
3. Database seeded with test data (if applicable)
4. Environment variables configured

**Testing Steps:**
1. 
2. 
3. 
4. 

**Expected Behavior:**
<!-- Describe what should happen at each step -->

### API Request/Response Examples
<!-- Provide example API calls and expected responses -->

**Request:**
```bash
curl -X POST http://localhost:3000/api/endpoint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"key": "value"}'
```

**Response:**
```json
{
  "success": true,
  "data": {}
}
```

### Test Results

**Frontend Tests:**
```
# npm test output from frontend
```

**Backend Tests:**
```
# npm test output from backend
```

**E2E Tests (if applicable):**
```
# Cypress or other E2E test output
```

### Screenshots/Videos & Logs
<!-- REQUIRED - Show the full user flow -->

**Before Changes:**
<!-- Screenshot of UI before -->

**After Changes:**
<!-- Screenshot of UI after -->

**Mobile View:**
<!-- Screenshot of mobile responsive view (if applicable) -->

**API Response (Developer Tools):**
<!-- Screenshot of network tab showing API request/response -->

**Server Logs:**
<!-- Relevant server log output showing successful operations -->
```
# Server log output here
```

### Database Changes (if applicable)
<!-- Show database schema changes or migration output -->
```sql
-- Migration SQL or schema changes
```

### Performance Impact
<!-- Describe any performance improvements or concerns -->
- [ ] API response time is acceptable (< 200ms for most endpoints)
- [ ] Frontend bundle size impact is minimal
- [ ] Database query performance is optimized

### Documentation Updates
- [ ] README updated with new setup steps (if any)
- [ ] API documentation updated (Swagger/Postman)
- [ ] Frontend component documentation updated
- [ ] Database schema documentation updated
- [ ] CHANGELOG.md updated with notable changes

### Environment Configuration
- [ ] New environment variables documented in .env.example (frontend)
- [ ] New environment variables documented in .env.example (backend)
- [ ] Configuration validation is implemented
- [ ] Backward compatibility maintained

### Related Issues/PRs
Closes #
Related to #

### Breaking Changes
<!-- List any breaking changes and migration instructions -->
- [ ] No breaking changes
- [ ] Breaking changes (describe below):

**Frontend Breaking Changes:**
<!-- List frontend breaking changes -->

**Backend Breaking Changes:**
<!-- List backend breaking changes -->

**Migration Instructions:**
<!-- Provide step-by-step migration instructions -->
1. 
2. 
3. 

### Additional Notes
<!-- Any additional information, context, dependencies, or concerns -->
