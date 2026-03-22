## 🖥️ Frontend Pull Request Template

### Overview
Briefly describe what changes have been made on the frontend.

### Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] UI/UX improvement
- [ ] Refactoring
- [ ] Performance improvement
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

### UI/UX Checklist
- [ ] UI changes match the design specifications/mockups exactly
- [ ] All interactive elements have appropriate hover/focus/active states
- [ ] Loading states are implemented for asynchronous operations
- [ ] Error states and error messages are user-friendly and helpful
- [ ] Empty states are handled appropriately
- [ ] Form validation provides clear, real-time feedback
- [ ] Success/confirmation messages are displayed when appropriate

### Responsiveness & Accessibility
- [ ] Tested on mobile devices (or responsive mode) - screens 320px to 480px
- [ ] Tested on tablets - screens 768px to 1024px
- [ ] Tested on desktop - screens 1280px and above
- [ ] All images have appropriate alt text
- [ ] Proper semantic HTML elements used (header, nav, main, section, etc.)
- [ ] Color contrast meets WCAG AA standards (4.5:1 for normal text)
- [ ] Keyboard navigation works properly (Tab, Enter, Escape)
- [ ] Screen reader tested or ARIA labels added where needed
- [ ] Focus indicators are visible and clear

### Testing Checklist
- [ ] All existing unit tests pass (`npm test` or equivalent)
- [ ] New unit tests added for new components/functions (minimum 80% coverage)
- [ ] Component tests include edge cases and error scenarios
- [ ] Integration tests updated if component interactions changed
- [ ] Manual testing completed in development environment
- [ ] Cross-browser testing done (Chrome, Firefox, Safari, Edge)

### Performance Checklist
- [ ] No unnecessary re-renders or infinite loops
- [ ] Large lists use virtual scrolling or pagination
- [ ] Images are optimized and use appropriate formats (WebP, lazy loading)
- [ ] No memory leaks (subscriptions properly unsubscribed)
- [ ] Bundle size impact is acceptable (check with build output)

### Security Checklist
- [ ] User input is properly sanitized to prevent XSS attacks
- [ ] Sensitive data (passwords, tokens) is not logged or exposed
- [ ] API keys and secrets are not hardcoded in the frontend
- [ ] Authentication tokens are stored securely (httpOnly cookies or secure storage)
- [ ] CSRF protection is in place for state-changing operations

### Documentation
- [ ] README updated if new setup steps or dependencies added
- [ ] Inline code comments added for complex logic
- [ ] Component documentation updated (props, events, usage examples)
- [ ] Storybook/style guide updated if new components added
- [ ] CHANGELOG.md updated with notable changes

### How to Test
<!-- Provide detailed step-by-step instructions -->
1. 
2. 
3. 

**Expected Behavior:**
<!-- Describe what should happen -->

**Edge Cases to Test:**
<!-- List specific edge cases that must be verified -->
- 
- 

### Screenshots/Videos
<!-- REQUIRED for UI changes - Attach before/after screenshots or screen recordings -->

**Before:**
<!-- Screenshot of the UI before changes -->

**After:**
<!-- Screenshot of the UI after changes -->

**Mobile View:**
<!-- Screenshot of mobile responsive view (if applicable) -->

### Related Issues/PRs
Closes #
Related to #

### Additional Notes
<!-- Any additional information, context, or concerns -->
