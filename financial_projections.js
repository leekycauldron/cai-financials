// Data structure classes
class VariableCostStructure {
    constructor(flatFee, includedMinutes, overageCostPerMinute) {
        this.flatFee = flatFee;
        this.includedMinutes = includedMinutes;
        this.overageCostPerMinute = overageCostPerMinute;
    }
}

class SubscriptionTier {
    constructor(name, dailyMinuteQuota, pricePerMonth, initialUserCount, churnRate, growthRate, usageRate = 0.8, churnRateChange = 0, growthRateChange = 0, churnRateStabilized = null, growthRateStabilized = null) {
        this.name = name;
        this.dailyMinuteQuota = dailyMinuteQuota;
        this.pricePerMonth = pricePerMonth;
        this.initialUserCount = initialUserCount;
        this.churnRate = churnRate;
        this.growthRate = growthRate;
        this.usageRate = usageRate;
        this.churnRateChange = churnRateChange;
        this.growthRateChange = growthRateChange;
        this.churnRateStabilized = churnRateStabilized;
        this.growthRateStabilized = growthRateStabilized;
    }
}

class FinancialProjection {
    constructor(subscriptionTiers, monthlyFixedExpenses, variableCostStructure, startDate, numMonths, availableFunding = 0, cacPerUser = 0, startupCosts = 0) {
        this.subscriptionTiers = subscriptionTiers;
        this.monthlyFixedExpenses = monthlyFixedExpenses;
        this.variableCostStructure = variableCostStructure;
        this.startDate = new Date(startDate);
        this.numMonths = numMonths;
        this.availableFunding = availableFunding;
        this.cacPerUser = cacPerUser;
        this.startupCosts = startupCosts;
        this.results = null;
    }

    calculateVariableCosts(totalMinutesUsed) {
        const flatFee = this.variableCostStructure.flatFee;
        
        if (totalMinutesUsed <= this.variableCostStructure.includedMinutes) {
            return [flatFee, 0, totalMinutesUsed];
        }
        
        const overageMinutes = totalMinutesUsed - this.variableCostStructure.includedMinutes;
        const overageCost = overageMinutes * this.variableCostStructure.overageCostPerMinute;
        
        return [flatFee, overageCost, overageMinutes];
    }

    calculateProjections() {
        // Generate dates array
        const dates = Array.from({ length: this.numMonths }, (_, i) => {
            const date = new Date(this.startDate);
            date.setMonth(date.getMonth() + i);
            return date.toISOString().slice(0, 7); // YYYY-MM format
        });

        // Initialize results object
        const results = {
            Date: dates,
            TotalRevenue: new Array(this.numMonths).fill(0),
            FixedExpenses: new Array(this.numMonths).fill(0),
            FlatFee: new Array(this.numMonths).fill(0),
            OverageCosts: new Array(this.numMonths).fill(0),
            CACCosts: new Array(this.numMonths).fill(0),
            TotalVariableCosts: new Array(this.numMonths).fill(0),
            TotalExpenses: new Array(this.numMonths).fill(0),
            GrossProfit: new Array(this.numMonths).fill(0),
            TotalMinutesUsed: new Array(this.numMonths).fill(0),
            OverageMinutes: new Array(this.numMonths).fill(0),
            NewUsersAcquired: new Array(this.numMonths).fill(0),
            MonthlyCashFlow: new Array(this.numMonths).fill(0),
            BurnRate: new Array(this.numMonths).fill(0),
            FundingDrawdown: new Array(this.numMonths).fill(0),
            RemainingFunding: new Array(this.numMonths).fill(0),
            CashPosition: new Array(this.numMonths).fill(0),
            FundingExhausted: false,
            FundingExhaustedMonth: null,
            BreakEvenMonth: null
        };

        // Calculate per tier metrics and track new users
        this.subscriptionTiers.forEach(tier => {
            const tierUsers = [];
            const tierRevenue = [];
            const tierMinutes = [];
            const tierNewUsers = [];
            let currentUsers = tier.initialUserCount;

            // Calculate monthly users and revenue for this tier
            for (let month = 0; month < this.numMonths; month++) {
                // Evolve rates monthly with stabilization bounds
                let churnRate = tier.churnRate + month * (tier.churnRateChange || 0);
                let growthRate = tier.growthRate + month * (tier.growthRateChange || 0);
                
                // Apply stabilization bounds if set
                if (tier.churnRateStabilized !== null) {
                    // For churn: if rate is decreasing (negative change), don't go below stabilized
                    // If rate is increasing (positive change), don't go above stabilized
                    if (tier.churnRateChange < 0) {
                        churnRate = Math.max(churnRate, tier.churnRateStabilized);
                    } else if (tier.churnRateChange > 0) {
                        churnRate = Math.min(churnRate, tier.churnRateStabilized);
                    }
                }
                
                if (tier.growthRateStabilized !== null) {
                    // For growth: if rate is decreasing (negative change), don't go below stabilized
                    // If rate is increasing (positive change), don't go above stabilized
                    if (tier.growthRateChange < 0) {
                        growthRate = Math.max(growthRate, tier.growthRateStabilized);
                    } else if (tier.growthRateChange > 0) {
                        growthRate = Math.min(growthRate, tier.growthRateStabilized);
                    }
                }
                
                // Final clamp to [0, 1]
                churnRate = Math.max(0, Math.min(1, churnRate));
                growthRate = Math.max(0, Math.min(1, growthRate));

                // Calculate churned and new users
                const churnedUsers = Math.floor(currentUsers * churnRate);
                const newUsers = Math.floor(currentUsers * growthRate);
                currentUsers = currentUsers - churnedUsers + newUsers;

                // Calculate revenue and minutes used
                const monthlyRevenue = currentUsers * tier.pricePerMonth;
                
                // Convert daily quota to monthly usage (assuming 30 days per month)
                const monthlyMinutesUsed = currentUsers * tier.dailyMinuteQuota * 30 * tier.usageRate;

                tierUsers.push(currentUsers);
                tierRevenue.push(monthlyRevenue);
                tierMinutes.push(monthlyMinutesUsed);
                tierNewUsers.push(newUsers);

                // Add to totals
                results.TotalRevenue[month] += monthlyRevenue;
                results.TotalMinutesUsed[month] += monthlyMinutesUsed;
                results.NewUsersAcquired[month] += newUsers;
            }

            // Add tier-specific metrics to results
            results[`${tier.name}Users`] = tierUsers;
            results[`${tier.name}Revenue`] = tierRevenue;
            results[`${tier.name}Minutes`] = tierMinutes;
            results[`${tier.name}NewUsers`] = tierNewUsers;
        });

        // Calculate variable costs including CAC
        for (let month = 0; month < this.numMonths; month++) {
            const [flatFee, overageCost, overageMinutes] = this.calculateVariableCosts(
                results.TotalMinutesUsed[month]
            );
            results.FlatFee[month] = flatFee;
            results.OverageCosts[month] = overageCost;
            
            // Calculate CAC costs
            const cacCost = results.NewUsersAcquired[month] * this.cacPerUser;
            results.CACCosts[month] = cacCost;
            
            results.TotalVariableCosts[month] = flatFee + overageCost + cacCost;
            results.OverageMinutes[month] = overageMinutes;
        }

        // Calculate total expenses and gross profit
        const totalMonthlyFixedExpenses = Object.values(this.monthlyFixedExpenses)
            .reduce((sum, value) => sum + value, 0);
        
        results.FixedExpenses = new Array(this.numMonths).fill(totalMonthlyFixedExpenses);
        results.TotalExpenses = results.FixedExpenses.map((fixed, i) => 
            fixed + results.TotalVariableCosts[i]
        );
        results.GrossProfit = results.TotalRevenue.map((rev, i) => 
            rev - results.TotalExpenses[i]
        );

        // Calculate monthly cash flow (burn rate)
        for (let month = 0; month < this.numMonths; month++) {
            const monthlyProfit = results.GrossProfit[month];
            results.MonthlyCashFlow[month] = monthlyProfit;
            results.BurnRate[month] = -monthlyProfit; // Negative cash flow = positive burn rate
        }

        // Calculate cash flow with funding drawdown (accounting for startup costs)
        let remainingFunding = this.availableFunding - this.startupCosts;
        let breakEvenFound = false;

        for (let month = 0; month < this.numMonths; month++) {
            const monthlyProfit = results.MonthlyCashFlow[month];
            
            // If we have negative cash flow, draw from available funding
            if (monthlyProfit < 0) {
                const fundingNeeded = Math.abs(monthlyProfit);
                
                if (remainingFunding >= fundingNeeded) {
                    // We have enough funding to cover the shortfall
                    results.FundingDrawdown[month] = fundingNeeded;
                    remainingFunding -= fundingNeeded;
                    results.CashPosition[month] = 0; // Break even with funding
                } else {
                    // Not enough funding to cover the shortfall
                    results.FundingDrawdown[month] = remainingFunding;
                    results.CashPosition[month] = monthlyProfit + remainingFunding; // Still negative
                    remainingFunding = 0;
                    
                    if (!results.FundingExhausted) {
                        results.FundingExhausted = true;
                        results.FundingExhaustedMonth = month + 1; // 1-indexed for display
                    }
                }
            } else {
                // Positive cash flow - no funding needed
                results.FundingDrawdown[month] = 0;
                results.CashPosition[month] = monthlyProfit;
                
                // Check for break-even (first month with positive cash flow)
                if (!breakEvenFound) {
                    results.BreakEvenMonth = month + 1; // 1-indexed for display
                    breakEvenFound = true;
                }
            }
            
            results.RemainingFunding[month] = remainingFunding;
        }

        this.results = results;
        return results;
    }
}

// Export the classes for use in other files
export { VariableCostStructure, SubscriptionTier, FinancialProjection };