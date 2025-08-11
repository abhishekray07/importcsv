# ImportCSV v1 Development Tasks

## 🎯 Goal: Achieve 80% Feature Parity
Position ImportCSV between CSVBox (budget) and OneSchema/FlatFile (enterprise) with strong AI differentiation and PLG focus.

## 📊 Competitive Analysis Summary
- **CSVBox**: $19-199/month, basic features, no compliance
- **OneSchema**: Enterprise pricing, SOC2, advanced validation
- **FlatFile**: AI-powered, enterprise focus, complex pricing
- **ImportCSV Target**: $49-399/month, AI-first, developer-friendly

---

## Phase 1: Core Competitiveness (4 Weeks)

### 🔴 1. AI-Powered Natural Language Interface
Chat interface for data transformations using natural language

#### Tasks:
- [ ] **Set up AI infrastructure**
  - [ ] Configure OpenAI/Anthropic API integration
  - [ ] Create AI service layer (`/backend/app/services/ai_service.py`)
  - [ ] Implement rate limiting and error handling
  - [ ] Add API key management in config

- [ ] **Build chat interface**
  - [ ] Create floating AI assistant button in toolbar
  - [ ] Design chat panel (sidebar or modal)
  - [ ] Implement message history
  - [ ] Add loading states and error handling

- [ ] **Implement transformation engine**
  - [ ] Parse natural language to transformation rules
  - [ ] Create transformation preview system
  - [ ] Implement common transformations:
    - [ ] Date format conversions
    - [ ] String manipulations (split, combine, clean)
    - [ ] Pattern-based fixes (phone, email)
    - [ ] Conditional transformations
  - [ ] Add rollback capability

- [ ] **Create transformation templates**
  - [ ] Pre-built common transformations
  - [ ] Save custom transformations
  - [ ] Share transformations across team

**Location**: `/frontend/src/importer/features/validation/components/AIAssistant/`
**Estimated Time**: 1 week
**Dependencies**: OpenAI API key, Spreadsheet interface

---

### 🔴 3. Smart Auto-Mapping with AI
Restore and enhance LLM-powered column mapping

#### Tasks:
- [ ] **Implement smart mapping engine**
  - [ ] Use embeddings for semantic similarity
  - [ ] Calculate confidence scores
  - [ ] Learn from user corrections (store in DB)
  - [ ] Implement fuzzy string matching fallback

- [ ] **Enhance mapping UI**
  - [ ] Show confidence indicators (color-coded)
  - [ ] Display alternative suggestions
  - [ ] Add "Accept All Suggestions" button
  - [ ] Implement mapping templates/presets

- [ ] **Add field type detection**
  - [ ] Auto-detect emails, phones, dates, numbers
  - [ ] Suggest appropriate validation rules
  - [ ] Configure format transformations

**Location**: `/frontend/src/importer/features/map-columns/components/SmartMapper/`
**Estimated Time**: 0.5 weeks
**Dependencies**: AI service

---

### 🔴 4. Bulk Operations & Smart Fixes
Enhanced validation with intelligent bulk editing

#### Tasks:
- [ ] **Implement bulk selection**
  - [ ] Multi-cell selection with Shift+Click
  - [ ] Select all cells with same error
  - [ ] Column/row selection
  - [ ] Selection counter display

- [ ] **Build smart fix system**
  - [ ] Pattern recognition for common errors
  - [ ] One-click fix for similar issues
  - [ ] AI-suggested corrections
  - [ ] Batch find & replace with regex

- [ ] **Create validation rule builder**
  - [ ] Visual rule configuration
  - [ ] Cross-field validation (if A then B)
  - [ ] Custom regex patterns
  - [ ] Conditional validation logic
  - [ ] Save validation presets

- [ ] **Add bulk actions toolbar**
  - [ ] Delete selected
  - [ ] Transform selected
  - [ ] Validate selected
  - [ ] Export selected

**Location**: `/frontend/src/importer/features/validation/components/BulkActions/`
**Estimated Time**: 0.5 weeks
**Dependencies**: Spreadsheet interface

---

### 🔴 5. Svix Webhook Integration
Replace current webhook system with enterprise-grade solution

#### Tasks:
- [ ] **Set up Svix integration**
  - [ ] Create Svix account and configure
  - [ ] Install Svix Python SDK
  - [ ] Configure API keys and endpoints
  - [ ] Set up webhook portal URL

- [ ] **Migrate webhook system**
  - [ ] Replace current webhook service with Svix
  - [ ] Migrate existing webhook configurations
  - [ ] Update event payload formats
  - [ ] Implement backward compatibility

- [ ] **Configure event types**
  - [ ] import.started
  - [ ] import.row.processed (with batching)
  - [ ] import.completed
  - [ ] import.failed
  - [ ] validation.errors
  - [ ] Custom events support

- [ ] **Add customer portal features**
  - [ ] Embedded webhook management UI
  - [ ] Event log viewing
  - [ ] Retry failed deliveries
  - [ ] Test webhook endpoints

**Location**: `/backend/app/services/svix_service.py`
**Estimated Time**: 0.5 weeks
**Dependencies**: Svix account ($99/month)

---

## 🛠 Technology Stack Decisions

### Spreadsheet Library
**Decision Needed by**: Week 1, Day 1
- [ ] **Option A: AG-Grid** (Recommended)
  - Pros: Most features, best performance, extensive docs
  - Cons: $750/dev license, complex API
  - Score: 9/10

- [ ] **Option B: Handsontable**
  - Pros: Good UX, simpler than AG-Grid
  - Cons: $790/dev license, fewer features
  - Score: 7/10

- [ ] **Option C: Extend react-data-grid**
  - Pros: Already in use, no license cost
  - Cons: Limited features, more dev time
  - Score: 5/10

### AI Provider
**Decision**: OpenAI GPT-4
- [ ] Set up OpenAI API account
- [ ] Configure rate limits
- [ ] Implement fallback to GPT-3.5 for cost

### Webhook Platform
**Decision**: Svix
- [ ] Sign up for Svix starter plan ($99/month)
- [ ] Configure development environment
- [ ] Set up production environment

---

## 📅 Timeline

### Week 1 (Days 1-5)
- [ ] Day 1: Select and set up spreadsheet library
- [ ] Days 2-4: Implement core spreadsheet features
- [ ] Day 5: Add editing capabilities

### Week 2 (Days 6-10)
- [ ] Days 6-7: Complete spreadsheet data operations
- [ ] Days 8-9: Set up AI infrastructure
- [ ] Day 10: Build chat interface

### Week 3 (Days 11-15)
- [ ] Days 11-12: Implement transformation engine
- [ ] Day 13: Smart mapping with AI
- [ ] Days 14-15: Bulk operations & smart fixes

### Week 4 (Days 16-20)
- [ ] Days 16-17: Svix integration
- [ ] Days 18-19: Testing & bug fixes
- [ ] Day 20: Documentation & deployment prep

---

## 📊 Success Metrics

### Performance
- [ ] Handle 100k+ rows without lag
- [ ] Sub-200ms response for AI suggestions
- [ ] 99.9% webhook delivery rate

### User Experience
- [ ] Auto-mapping accuracy >80%
- [ ] Bulk fix 100+ errors in <5 seconds
- [ ] Natural language success rate >90%

### Business Impact
- [ ] 50% reduction in data cleanup time
- [ ] 30% increase in import completion rate
- [ ] 40% reduction in support tickets

---

## Phase 2: Enterprise Readiness (Weeks 5-8)
*To be detailed after Phase 1 completion*

### 🟡 High-Level Features:
- [ ] Large file support (1M+ rows with streaming)
- [ ] SOC2 compliance preparation
- [ ] Team workspaces and permissions
- [ ] Import templates and history
- [ ] Audit logging
- [ ] Advanced analytics dashboard

---

## Phase 3: Market Differentiation (Weeks 9-12)
*To be detailed after Phase 2 completion*

### 🟢 High-Level Features:
- [ ] Direct database connectors
- [ ] SaaS integrations (Salesforce, HubSpot)
- [ ] Public sharing links
- [ ] Advanced AI transformations
- [ ] Custom branding options
- [ ] API v2 with GraphQL

---

## 📝 Notes

### Development Guidelines
- All features must maintain backward compatibility
- Each feature needs unit tests (>80% coverage)
- Documentation required for all new APIs
- Performance benchmarks before/after major changes

### Design Principles
1. **AI-First**: Every feature should leverage AI where beneficial
2. **Developer-Friendly**: APIs and SDKs should be intuitive
3. **Performance**: Must handle enterprise-scale data
4. **Reliability**: 99.9% uptime target

### Risk Mitigation
- Keep current system running while building new features
- Feature flag all new functionality
- Gradual rollout to test users
- Maintain rollback capability

---

## 🔗 Resources

### Documentation
- [AG-Grid Docs](https://www.ag-grid.com/react-data-grid/)
- [Svix Integration Guide](https://docs.svix.com/)
- [OpenAI API Reference](https://platform.openai.com/docs/)

### Internal Docs
- API Documentation: `/docs/api/`
- Frontend Architecture: `/frontend/README.md`
- Backend Architecture: `/backend/README.md`

### Competitor References
- [CSVBox Features](https://csvbox.io/features)
- [OneSchema Docs](https://docs.oneschema.co/)
- [FlatFile Platform](https://flatfile.com/platform)

---

*Last Updated: [Current Date]*
*Status: Planning Phase 1*
*Owner: Engineering Team*