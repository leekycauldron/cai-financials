// Data structure classes
class VariableCostStructure {
    constructor(flatFee, includedMinutes, overageCostPerMinute) {
        this.flatFee = flatFee;
        this.includedMinutes = includedMinutes;
        this.overageCostPerMinute = overageCostPerMinute;
    }
}

class SubscriptionTier {
    constructor(name, minuteQuota, pricePerMonth, initialUserCount, churnRate, growthRate, usageRate = 0.8) {
        this.name = name;
        this.minuteQuota = minuteQuota;
        this.pricePerMonth = pricePerMonth;
        this.initialUserCount = initialUserCount;
        this.churnRate = churnRate;
        this.growthRate = growthRate;
        this.usageRate = usageRate;
    }
}

class FinancialProjection {
    constructor(subscriptionTiers, monthlyFixedExpenses, variableCostStructure, startDate, numMonths, initialCash = 0) {
        this.subscriptionTiers = subscriptionTiers;
        this.monthlyFixedExpenses = monthlyFixedExpenses;
        this.variableCostStructure = variableCostStructure;
        this.startDate = new Date(startDate);
        this.numMonths = numMonths;
        this.initialCash = initialCash;
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
            TotalVariableCosts: new Array(this.numMonths).fill(0),
            TotalExpenses: new Array(this.numMonths).fill(0),
            GrossProfit: new Array(this.numMonths).fill(0),
            TotalMinutesUsed: new Array(this.numMonths).fill(0),
            OverageMinutes: new Array(this.numMonths).fill(0),
            CashFlow: new Array(this.numMonths).fill(0),
            CumulativeCash: new Array(this.numMonths).fill(0),
            FundingRequired: new Array(this.numMonths).fill(0),
            BreakEvenMonth: null
        };

        // Calculate per tier metrics
        this.subscriptionTiers.forEach(tier => {
            const tierUsers = [];
            const tierRevenue = [];
            const tierMinutes = [];
            let currentUsers = tier.initialUserCount;

            // Calculate monthly users and revenue for this tier
            for (let month = 0; month < this.numMonths; month++) {
                // Calculate churned and new users
                const churnedUsers = Math.floor(currentUsers * tier.churnRate);
                const newUsers = Math.floor(currentUsers * tier.growthRate);
                currentUsers = currentUsers - churnedUsers + newUsers;

                // Calculate revenue and minutes used
                const monthlyRevenue = currentUsers * tier.pricePerMonth;
                const monthlyMinutesUsed = currentUsers * tier.minuteQuota * tier.usageRate;

                tierUsers.push(currentUsers);
                tierRevenue.push(monthlyRevenue);
                tierMinutes.push(monthlyMinutesUsed);

                // Add to totals
                results.TotalRevenue[month] += monthlyRevenue;
                results.TotalMinutesUsed[month] += monthlyMinutesUsed;
            }

            // Add tier-specific metrics to results
            results[`${tier.name}Users`] = tierUsers;
            results[`${tier.name}Revenue`] = tierRevenue;
            results[`${tier.name}Minutes`] = tierMinutes;
        });

        // Calculate variable costs
        for (let month = 0; month < this.numMonths; month++) {
            const [flatFee, overageCost, overageMinutes] = this.calculateVariableCosts(
                results.TotalMinutesUsed[month]
            );
            results.FlatFee[month] = flatFee;
            results.OverageCosts[month] = overageCost;
            results.TotalVariableCosts[month] = flatFee + overageCost;
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

        // Calculate cash flow and funding requirements
        let cumulativeCash = this.initialCash;
        let breakEvenFound = false;

        for (let month = 0; month < this.numMonths; month++) {
            const monthlyProfit = results.GrossProfit[month];
            results.CashFlow[month] = monthlyProfit;
            
            cumulativeCash += monthlyProfit;
            results.CumulativeCash[month] = cumulativeCash;
            
            // Calculate funding required to maintain positive cash balance
            if (cumulativeCash < 0) {
                results.FundingRequired[month] = Math.abs(cumulativeCash);
            } else {
                results.FundingRequired[month] = 0;
                if (!breakEvenFound && month > 0) {
                    results.BreakEvenMonth = month + 1; // 1-indexed for display
                    breakEvenFound = true;
                }
            }
        }

        this.results = results;
        return results;
    }
}

// Export the classes for use in other files
export { VariableCostStructure, SubscriptionTier, FinancialProjection };