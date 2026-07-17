package ai

const (
	pdSharedPrompt = `You are crafting a slide for an investor pitch deck. Each slide must:
- Tell a story: lead with the insight, support with data
- Be concise but complete: 1-2 paragraph narrative + 2-4 bullet points
- Use confident, compelling language
- Include specific numbers where available (label as projections)
- Every slide must have meaningful content — no placeholders`

	pdCoverPrompt = `Create the COVER slide for an investor pitch deck.

ELEMENTS:
- Company name (hero position)
- One-line positioning statement (the most compelling description)
- "PITCH DECK" label
- Date and "Confidential" notice
- Visual: bold, clean, professional

Tone: confident, ambitious, credible.

Return JSON:
{"id":"cover","type":"title","title":"Company Name","content":"One-line positioning","bullets":["PITCH DECK","Date","Confidential"],"order":0,"layout":"center"}`

	pdProblemPrompt = `Create the PROBLEM slide.

CONTENT:
- 3 specific pain points your target customers experience
- 1 bold statistic or fact that makes the problem feel urgent
- Why existing solutions fall short
- Why this problem matters NOW

The goal: make the investor feel the pain and urgency.

Return JSON:
{"id":"problem","type":"problem","title":"The Problem","content":"narrative paragraph","bullets":["Pain point 1","Pain point 2","Pain point 3"],"order":1,"layout":"split"}`

	pdSolutionPrompt = `Create the SOLUTION slide.

CONTENT:
- Your value proposition in one sentence
- 3 key capabilities or features that solve the problem
- How your solution is different from existing alternatives
- The magic: what makes your approach special

Show, don't just tell. Focus on outcomes.

Return JSON:
{"id":"solution","type":"solution","title":"Our Solution","content":"narrative paragraph","bullets":["Capability 1","Capability 2","Capability 3"],"order":2,"layout":"split"}`

	pdMarketPrompt = `Create the MARKET OPPORTUNITY slide.

CONTENT:
- TAM/SAM/SOM with realistic numbers (label as projections)
- Market growth trend and trajectory
- Key market drivers and tailwinds
- Why this market is large enough for a venture-scale business

Make the opportunity feel big but credible.

Return JSON:
{"id":"market","type":"market","title":"Market Opportunity","content":"narrative with TAM/SAM/SOM","bullets":["TAM: $X","SAM: $Y","SOM: $Z","Growth: X% CAGR"],"order":3,"layout":"center"}`

	pdProductPrompt = `Create the PRODUCT slide.

CONTENT:
- How the product/service works in 3-5 clear steps
- Key features and the benefits they unlock
- Screenshot or user flow description
- What makes the product experience delightful or effective

Focus on clarity and value. Avoid jargon.

Return JSON:
{"id":"product","type":"product","title":"How It Works","content":"narrative paragraph","bullets":["Step 1: Discovery","Step 2: Solution","Step 3: Delivery"],"order":4,"layout":"split"}`

	pdBusinessModelPrompt = `Create the BUSINESS MODEL slide.

CONTENT:
- Revenue streams (how you make money)
- Pricing model and rationale
- Unit economics: ARPU, LTV, CAC if available
- Gross margins
- Path to profitability

Numbers build credibility. Label projections clearly.

Return JSON:
{"id":"business-model","type":"business-model","title":"Business Model","content":"narrative paragraph","bullets":["Revenue stream 1","Revenue stream 2","Unit economics"],"order":5,"layout":"split"}`

	pdTractionPrompt = `Create the TRACTION slide.

CONTENT:
- Key metrics achieved so far (users, revenue, growth rate, etc.)
- Milestones reached (launch, partnerships, awards)
- Current momentum and trajectory
- Upcoming milestones and roadmap

Even if early-stage, highlight what you have learned and achieved.

Return JSON:
{"id":"traction","type":"traction","title":"Traction & Roadmap","content":"narrative paragraph","bullets":["Milestone 1","Milestone 2","Upcoming milestone"],"order":6,"layout":"center"}`

	pdCompetitionPrompt = `Create the COMPETITION slide.

CONTENT:
- Competitive landscape overview
- Your unfair advantage: why you win
- Key differentiators vs. each competitor type
- Barriers to entry you have built

Confident but not arrogant. Acknowledge competition credibly.

Return JSON:
{"id":"competition","type":"competition","title":"Why We Win","content":"narrative paragraph","bullets":["Differentiator 1","Differentiator 2","Differentiator 3"],"order":7,"layout":"split"}`

	pdTeamPrompt = `Create the TEAM slide.

CONTENT:
- Key team members with names and roles
- Relevant experience and credibility highlights
- Why this team is uniquely qualified to execute
- Advisors or board members (if notable)

Investors bet on teams. Make this slide compelling.

Return JSON:
{"id":"team","type":"team","title":"The Team","content":"narrative paragraph","bullets":["Name — Role — Background","Name — Role — Background","Name — Role — Background"],"order":8,"layout":"center"}`

	pdFinancialsPrompt = `Create the FINANCIALS slide.

CONTENT:
- 3-year revenue and cost projections
- Key financial assumptions
- Gross margin trajectory
- Burn rate and runway
- Path to profitability

ALL figures are projections. Label clearly.

Return JSON:
{"id":"financials","type":"financials","title":"Financial Outlook","content":"narrative paragraph","bullets":["Year 1: Revenue $X, Costs $Y","Year 2: Revenue $X, Costs $Y","Year 3: Revenue $X, Costs $Y"],"order":9,"layout":"center"}`

	pdAskPrompt = `Create the ASK slide — the final slide of the pitch deck.

CONTENT:
- Funding amount requested
- How the funds will be used (3 clear buckets)
- What this funding will achieve (milestone or inflection point)
- Closing statement and contact information
- Call to action

Clear, specific, compelling. Make it easy to say yes.

Return JSON:
{"id":"ask","type":"ask","title":"The Ask","content":"narrative paragraph","bullets":["Use bucket 1: $X","Use bucket 2: $Y","Use bucket 3: $Z"],"order":10,"layout":"center"}`

	pdSlideOrder = `cover,problem,solution,market,product,business-model,traction,competition,team,financials,ask`
)
