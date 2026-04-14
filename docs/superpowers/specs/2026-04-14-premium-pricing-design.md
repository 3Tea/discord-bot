# Premium Pricing — Design Spec

## Goal

Define pricing for the two-tier premium subscription (Star + Galaxy) across two markets: Vietnam (primary) and International.

## Pricing Table

### Vietnam Market (VND)

| Gói | Monthly | Annual | Savings |
|-----|---------|--------|---------|
| **Star** | 29,000 VND | 290,000 VND | ~17% |
| **Galaxy** | 59,000 VND | 590,000 VND | ~17% |

### International Market (USD)

| Tier | Monthly | Annual | Savings |
|------|---------|--------|---------|
| **Star** | $1.99 | $19.99 | ~16% |
| **Galaxy** | $3.99 | $39.99 | ~16% |

## Pricing Rationale

### Vietnam

- **Star 29k VND**: Below 30k psychological threshold for Gen Z VN. ~1/4 of Discord Nitro VN price (113k). Cheaper than a milk tea — impulse buy territory.
- **Galaxy 59k VND**: ~1/2 of Discord Nitro VN price. Anchoring effect makes Star look like a bargain. Still accessible for active users.
- **Annual discount ~17%**: Two months free equivalent. Encourages commitment without feeling like a huge upfront cost (290k = ~$11.50).

### International

- **Star $1.99**: Cheapest in the Discord bot market (YAGPDB $3.50, Dyno $4.99, Carl-bot $7.99, MEE6 $11.95). Penetration pricing to attract users from competitors.
- **Galaxy $3.99**: Still undercuts Dyno ($4.99) and significantly cheaper than MEE6. Competitive advantage.
- **Annual discount ~16%**: Standard SaaS annual discount.

### VN/International Ratio

- Star: 29k VND ≈ $1.15 vs $1.99 = 58% of international price
- Galaxy: 59k VND ≈ $2.35 vs $3.99 = 59% of international price
- Consistent with Discord's own localized pricing for Vietnam (40-55% of USD price)

## Market Context

### Competitor Pricing (monthly, USD)

| Bot | Lowest Tier | Highest Tier |
|-----|-------------|-------------|
| YAGPDB | $3.50 | $3.50 |
| Dyno | $4.99 | $4.99 |
| ProBot | $5.00 | $10.00 |
| Carl-bot | $7.99 | $7.99 |
| MEE6 | $11.95 | $11.95 |
| **3AT Star** | **$1.99** | — |
| **3AT Galaxy** | — | **$3.99** |

### Vietnam Benchmarks

| Product | Price/month (VND) |
|---------|-------------------|
| Discord Nitro (VN) | ~113,000 |
| Mobile game subscription (typical) | 22,000-49,000 |
| Spotify Premium (VN) | 59,000 |
| **3AT Star** | **29,000** |
| **3AT Galaxy** | **59,000** |

## Implementation Notes

- Pricing should be stored as configuration (not hardcoded) to allow future adjustments
- Market detection: use user's locale or payment method currency to determine which pricing applies
- Annual billing is optional at launch — monthly is the priority
- Payment gateway integration is a separate spec (out of scope here)

## Future Considerations

- **Price increase path**: Once user base grows and brand is established, prices can increase 20-30% without significant churn (standard SaaS practice)
- **Promotional pricing**: First month at 50% for new subscribers (optional future feature)
- **Bundle discounts**: Multiple-server discount if server premium is added later
