# Sealevel Studio - Comprehensive Test Plan

## Test Coverage Overview

This document outlines the test plan for all features in Sealevel Studio. Tests are organized by feature area.

---

## 1. Landing Page Tests

### 1.1 Button Functionality
- [ ] **Header "Get Started" button**
  - Click triggers navigation
  - Button is visible and clickable
  - Proper cursor pointer on hover
  
- [ ] **Hero Section "Get Started" button**
  - Click triggers navigation
  - Button is visible and clickable
  - Proper cursor pointer on hover
  
- [ ] **CTA Section "Start Building Free" button**
  - Click triggers navigation
  - Button is visible and clickable
  - Proper cursor pointer on hover

### 1.2 Visual Elements
- [ ] Logo video loads and displays
- [ ] Fallback text appears if video fails
- [ ] Scroll behavior works correctly
- [ ] Responsive design on mobile/tablet

---

## 2. AI Cyber Playground Tests

### 2.1 Arbitrage Scanning
- [ ] **Query Detection**
  - "Find arbitrage opportunities" triggers scan
  - "Find best arbitrage" triggers scan
  - Other queries don't trigger scan
  
- [ ] **Scanning Process**
  - Progress indicator shows during scan
  - Scanner actually calls PoolScanner.scan()
  - ArbitrageDetector.detectOpportunities() is called
  - Birdeye optimizer initializes if available
  
- [ ] **Results Display**
  - Opportunities are displayed when found
  - Best opportunity shows correct details
  - Top 3 opportunities are listed
  - Strategy analysis is shown
  - Execution recommendations appear
  
- [ ] **No Opportunities Found**
  - Helpful message is displayed
  - Scanned pool count is shown
  - Advanced strategies are suggested

### 2.2 Master AI Responses
- [ ] **Jito/MEV Queries**
  - Detects queries about Jito, bundles, MEV
  - Provides detailed MEV strategy explanation
  - Mentions ShredStream and Block Engine
  
- [ ] **Flash Loan Queries**
  - Detects queries about flash loans, Kamino
  - Explains zero-capital arbitrage
  - Provides execution blueprint
  
- [ ] **Strategy Queries**
  - Detects strategy/how-to queries
  - Provides comprehensive strategy guide
  - Lists different arbitrage types

### 2.3 Agent System
- [ ] Master AI agent status updates correctly
- [ ] Arbitrage Hunter agent activates during scans
- [ ] Agent health and context counts update
- [ ] Task queue displays correctly

---

## 3. R&D Console Tests

### 3.1 Draggable Functionality
- [ ] **Minimized State**
  - Console can be dragged when minimized
  - Position persists during drag
  - Stays within viewport bounds
  
- [ ] **Expanded State**
  - Header area triggers drag
  - Buttons don't trigger drag
  - Input fields don't trigger drag
  - Position updates smoothly
  
- [ ] **Viewport Constraints**
  - Console cannot be dragged outside viewport
  - Position is constrained to visible area

### 3.2 Console Functionality
- [ ] Commands execute correctly
- [ ] Output displays properly
- [ ] Scroll works in output area
- [ ] Command history (↑/↓) works
- [ ] Clear command works
- [ ] Mode switching (console/scanner) works

---

## 4. Navigation & Routing Tests

### 4.1 Sidebar Navigation
- [ ] All menu items are clickable
- [ ] Active view highlights correctly
- [ ] Navigation between views works
- [ ] AI section is visible
- [ ] Old AI dropdown is removed

### 4.2 View Switching
- [ ] Account Inspector loads
- [ ] Transaction Builder loads
- [ ] Arbitrage Scanner loads
- [ ] AI Cyber Playground loads
- [ ] All other views load correctly

---

## 5. Account Inspector Tests

### 5.1 Basic Functionality
- [ ] Accepts account address input
- [ ] Fetches account data from blockchain
- [ ] Displays account information
- [ ] Handles invalid addresses gracefully
- [ ] Shows loading state during fetch

### 5.2 Account Parsing
- [ ] System accounts are parsed correctly
- [ ] Token accounts are parsed correctly
- [ ] Program accounts are parsed correctly
- [ ] Unknown accounts show raw data

---

## 6. Transaction Builder Tests

### 6.1 Instruction Building
- [ ] Can add instructions
- [ ] Can remove instructions
- [ ] Can reorder instructions
- [ ] Form validation works
- [ ] Account requirements are validated

### 6.2 Transaction Execution
- [ ] Transaction can be built
- [ ] Transaction can be simulated
- [ ] Simulation shows before/after state
- [ ] Transaction can be signed
- [ ] Transaction can be sent

---

## 7. Arbitrage Scanner Tests

### 7.1 Scanning
- [ ] Scan button triggers pool scanning
- [ ] Progress indicator shows
- [ ] Pools are fetched from DEXs
- [ ] Opportunities are detected
- [ ] Results are displayed

### 7.2 Opportunity Display
- [ ] Opportunities are sorted by profit
- [ ] Filtering by DEX works
- [ ] Sorting options work
- [ ] Opportunity details are accurate

### 7.3 Execution
- [ ] Execute button appears for opportunities
- [ ] Transaction building works
- [ ] Execution status updates
- [ ] Results are displayed

---

## 8. AI Agents Tests

### 8.1 Agent Chat
- [ ] Messages send correctly
- [ ] Responses are received
- [ ] Suggestions work
- [ ] Auto-messages appear
- [ ] Scroll works in chat area

### 8.2 Agent Switching
- [ ] Can switch between agents
- [ ] Agent context is maintained
- [ ] Agent-specific responses are correct

---

## 9. Wallet Integration Tests

### 9.1 Connection
- [ ] Wallet button appears
- [ ] Can connect wallet
- [ ] Wallet address displays
- [ ] Can disconnect wallet

### 9.2 Wallet Operations
- [ ] Balance displays correctly
- [ ] Transactions can be signed
- [ ] Network switching works

---

## 10. UI/UX Tests

### 10.1 Responsive Design
- [ ] Mobile layout works
- [ ] Tablet layout works
- [ ] Desktop layout works
- [ ] Sidebar collapses on mobile

### 10.2 Accessibility
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] Screen reader compatible
- [ ] Color contrast is sufficient

### 10.3 Performance
- [ ] Page loads quickly
- [ ] No console errors
- [ ] No memory leaks
- [ ] Smooth animations

---

## 11. Error Handling Tests

### 11.1 Network Errors
- [ ] RPC connection failures handled
- [ ] API errors are displayed
- [ ] Retry mechanisms work

### 11.2 User Errors
- [ ] Invalid inputs are rejected
- [ ] Error messages are clear
- [ ] Recovery options are provided

---

## 12. Integration Tests

### 12.1 End-to-End Flows
- [ ] Complete arbitrage flow: Scan → Find → Build → Execute
- [ ] Complete transaction flow: Build → Simulate → Sign → Send
- [ ] Complete account inspection flow: Enter → Fetch → Display

### 12.2 Cross-Feature Integration
- [ ] Arbitrage Scanner → Transaction Builder
- [ ] Account Inspector → Transaction Builder
- [ ] AI Agents → Transaction Builder

---

## Test Execution Checklist

### Pre-Testing Setup
- [ ] Development server is running
- [ ] Wallet is connected (for wallet-dependent tests)
- [ ] Network is set to devnet (for safety)
- [ ] Browser console is open (to check for errors)

### Testing Order
1. Landing Page (quick visual check)
2. Navigation (all views accessible)
3. Core Features (Account Inspector, Transaction Builder, Arbitrage Scanner)
4. AI Features (AI Cyber Playground, AI Agents)
5. Advanced Features (R&D Console, Premium Services)
6. Integration Tests (end-to-end flows)

### Issues to Document
- Feature not working
- UI/UX problems
- Performance issues
- Error messages
- Browser compatibility issues

---

## Automated Testing (Future)

### Unit Tests
- Component rendering
- Function logic
- Utility functions
- State management

### Integration Tests
- API interactions
- Wallet operations
- Transaction building
- Arbitrage detection

### E2E Tests
- Complete user flows
- Cross-browser testing
- Performance benchmarks

---

## Notes

- Most tests require manual execution currently
- Automated testing framework to be set up
- Focus on critical user paths first
- Document all issues found during testing

