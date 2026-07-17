package ai

const (
	bpCoverPrompt = `You are a world-class business strategist. Write the COVER PAGE for a business plan.

Write a cover page with:
- Company name (dominant)
- Tagline or one-line positioning statement
- "Business Plan" subtitle
- Date (use current: 2025)
- Version label
- "CONFIDENTIAL" notice
- Contact info (location, email placeholder)

Tone: professional, confident, polished.
Return JSON: {"id":"cover","title":"Cover Page","content":"full text with proper line breaks","order":0}`

	bpExecutiveSummaryPrompt = `You are a senior business strategist. Write the EXECUTIVE SUMMARY section of a business plan.

CONTENT REQUIRED:
- The problem your business solves (specific pain points)
- Your solution (how you solve it uniquely)
- Target market overview (who you serve)
- Business model summary (how you make money)
- Financial highlights (revenue projection, funding ask if applicable)
- Key milestones achieved or planned
- The ask (what you need to grow)

Tone: confident, concise, compelling. 2-3 paragraphs.
Use the business profile context for specifics.
Return JSON: {"id":"executive-summary","title":"Executive Summary","content":"full text with line breaks","order":1}`

	bpCompanySummaryPrompt = `You are a business historian and strategist. Write the COMPANY SUMMARY section.

CONTENT REQUIRED:
1. Mission Statement — compelling and specific
2. Vision Statement — aspirational and market-focused
3. Company Story — founding context, problem discovered, why you exist
4. Business Structure — legal form, ownership, founding date
5. Leadership — key roles and their backgrounds
6. Core Values — 4-6 authentic values that guide decisions
7. Company Culture — what makes working there different

Adapt tone to industry:
- Tech/Startup: bold, mission-driven, innovative
- Professional Services: authoritative, trusted, experienced
- Retail/Consumer: warm, customer-centric, approachable
- Healthcare: clean, trustworthy, human-centred
- Finance: precise, data-rich, confidence-inspiring

Return JSON: {"id":"company-summary","title":"Company Summary","content":"full text with line breaks","order":2}`

	bpOpportunityPrompt = `You are a senior market analyst. Write the MARKET OPPORTUNITY section.

CONTENT REQUIRED:
1. Problem Statement — the specific pain points your target customers face
2. Market Context — current industry trends and dynamics
3. Why Now — timing rationale: tech readiness, consumer shifts, regulatory changes
4. Market Size — TAM/SAM/SOM with realistic figures (label as projections)
5. Competitive Landscape — who else is in the space, their strengths/weaknesses
6. Unique Value Proposition — what makes you different and better
7. Market Entry Strategy — how you will enter and grow in the market

All market figures must be labelled as "Projection — estimate."
Return JSON: {"id":"market-opportunity","title":"Market Opportunity","content":"full text with line breaks","order":3}`

	bpTargetAudiencePrompt = `You are a customer research analyst. Write the TARGET AUDIENCE section.

CONTENT REQUIRED:
1. Customer Personas — 2-3 detailed personas with:
   - Name, age, role, location (realistic but fictional)
   - Goals and motivations
   - Pain points and frustrations
   - How your solution helps them
2. Market Segmentation — how the market breaks down by segment
3. Customer Journey — touchpoints from awareness to purchase to advocacy
4. Acquisition Channels — how you reach each persona

Return JSON: {"id":"target-audience","title":"Target Audience","content":"full text with line breaks","order":4}`

	bpProductsServicesPrompt = `You are a product strategist. Write the PRODUCTS & SERVICES section.

CONTENT REQUIRED:
1. Core Offerings — describe what you actually sell or provide
2. Key Features — what makes each offering unique and valuable
3. Customer Benefits — specific outcomes customers achieve
4. Competitive Advantages — why customers choose you over alternatives
5. Development Roadmap — near-term and long-term product evolution
6. Pricing Strategy — how you price (tiers, subscription, one-time, etc.)
7. Delivery/Support Model — how customers receive and get help with your offering

Return JSON: {"id":"products-services","title":"Products & Services","content":"full text with line breaks","order":5}`

	bpMarketingSalesPrompt = `You are a go-to-market strategist. Write the MARKETING & SALES section.

CONTENT REQUIRED:
1. Marketing Strategy — positioning, messaging, brand pillars
2. Acquisition Channels — specific channels that work for this industry
   (digital ads, content marketing, partnerships, direct sales, referrals, etc.)
3. Sales Process — how a lead becomes a customer (self-serve vs sales-led vs hybrid)
4. Customer Retention — how you keep customers and reduce churn
5. KPIs & Metrics — what you measure (CAC, LTV, conversion rates, etc.)
6. Budget Allocation — how marketing budget is distributed across channels
7. Implementation Timeline — phased rollout of marketing initiatives

Return JSON: {"id":"marketing-sales","title":"Marketing & Sales","content":"full text with line breaks","order":6}`

	bpFinancialPlanPrompt = `You are a financial analyst. Write the FINANCIAL PLAN section.

CONTENT REQUIRED:
1. Revenue Model — how the business generates income (streams, pricing, volume)
2. 3-Year Projections — Year 1, 2, 3 revenue and cost projections
   - Break down: revenue by stream, COGS, operating expenses, gross margin
3. Cost Structure — fixed costs, variable costs, one-time investments
4. Break-even Analysis — when the business becomes profitable
5. Funding Requirements — how much capital is needed and how it will be used
6. Financial Risks — key risks and mitigation strategies

IMPORTANT: ALL figures are projections — label them as "Projection — estimate."
Never invent precise figures without basis from the business context.
Return JSON: {"id":"financial-plan","title":"Financial Plan","content":"full text with line breaks","order":7}`

	bpGoalPlanningPrompt = `You are a strategy consultant. Write the GOAL PLANNING section.

CONTENT REQUIRED:
1. Strategic Objectives — 3-5 SMART objectives (Specific, Measurable, Achievable, Relevant, Time-bound)
2. Key Milestones — critical achievements with target dates
3. Implementation Timeline — phased approach (0-6 months, 6-12 months, 12-24 months)
4. Resource Allocation — what resources (people, capital, technology) each phase needs
5. Risk Assessment — top risks and contingency plans
6. Success Metrics — how you measure progress toward objectives

Return JSON: {"id":"goal-planning","title":"Goal Planning","content":"full text with line breaks","order":8}`

	bpAppendixPrompt = `You are a business plan compiler. Write the APPENDIX section.

CONTENT REQUIRED:
1. Financial Assumptions — key assumptions behind the financial projections
2. Market Research Sources — types of sources consulted for market data
3. Team Profiles — brief backgrounds of key team members
4. Product Details — additional technical or operational details
5. Legal & Regulatory Notes — relevant compliance considerations

Keep this brief but substantive. Reference the business context.
Return JSON: {"id":"appendix","title":"Appendix","content":"full text with line breaks","order":9}`

	// Business plan section order for display
	bpSectionOrder = `cover,executive-summary,company-summary,market-opportunity,target-audience,products-services,marketing-sales,financial-plan,goal-planning,appendix`
)
