// fixed-income.ts - Bond Calculator
import Decimal from 'decimal.js';

Decimal.set({ precision: 32, rounding: Decimal.ROUND_HALF_UP });

interface Bond {
  faceValue: number;  // 1000 (par)
  couponRate: number; // 0.05 (5%)
  periodsPerYear: number; // 2 (semi-annual)
  yearsToMaturity: number;
  yieldToMaturity: number; // Market yield
  currentPrice?: number;
}

class FixedIncome {
  
  // Discount factor for period t
  private discountFactor(t: number, ytm: Decimal, periodsPerYear: number): Decimal {
    return new Decimal(1).div((1 + ytm.div(periodsPerYear)).pow(t));
  }

  calculatePrice(bond: Bond): number {
    const { faceValue, couponRate, periodsPerYear, yearsToMaturity, yieldToMaturity } = bond;
    const FV = new Decimal(faceValue);
    const C = FV.mul(couponRate).div(periodsPerYear); // Coupon payment
    const YTM = new Decimal(yieldToMaturity);
    const N = Math.floor(yearsToMaturity * periodsPerYear); // Total periods

    let price = new Decimal(0);
    
    // Sum discounted coupons
    for (let t = 1; t <= N; t++) {
      price = price.add(C.mul(this.discountFactor(t, YTM, periodsPerYear)));
    }
    
    // Add face value at maturity
    price = price.add(FV.mul(this.discountFactor(N, YTM, periodsPerYear)));
    
    return price.toNumber();
  }

  calculateDuration(bond: Bond): number {
    const price = this.calculatePrice(bond);
    const { faceValue, couponRate, periodsPerYear, yearsToMaturity, yieldToMaturity } = bond;
    const FV = new Decimal(faceValue);
    const C = FV.mul(couponRate).div(periodsPerYear);
    const YTM = new Decimal(yieldToMaturity);
    const N = Math.floor(yearsToMaturity * periodsPerYear);
    let weightedCashFlows = new Decimal(0);
    let totalWeight = new Decimal(0);

    for (let t = 1; t <= N; t++) {
      const cf = t === N ? C.add(FV) : C;
      const pv = cf.mul(this.discountFactor(t, YTM, periodsPerYear));
      const weight = pv.div(price);
      weightedCashFlows = weightedCashFlows.add(new Decimal(t).mul(weight));
    }

    return weightedCashFlows.div(periodsPerYear).toNumber(); // Macaulay duration
  }

  calculateConvexity(bond: Bond): number {
    const price = this.calculatePrice(bond);
    const { faceValue, couponRate, periodsPerYear, yearsToMaturity, yieldToMaturity } = bond;
    const FV = new Decimal(faceValue);
    const C = FV.mul(couponRate).div(periodsPerYear);
    const YTM = new Decimal(yieldToMaturity);
    const N = Math.floor(yearsToMaturity * periodsPerYear);
    
    let convexitySum = new Decimal(0);

    for (let t = 1; t <= N; t++) {
      const cf = t === N ? C.add(FV) : C;
      const df = this.discountFactor(t, YTM, periodsPerYear);
      convexitySum = convexitySum.add(new Decimal(t * (t + 1)).mul(cf).mul(df));
    }

    return convexitySum.div(new Decimal(price).mul(new Decimal(1 + yieldToMaturity / periodsPerYear).pow(2)))
                     .div(new Decimal(periodsPerYear).pow(2)).toNumber();
  }
}

// Usage: Corporate Treasury Bond Portfolio
const treasuryBond: Bond = {
  faceValue: 1000,
  couponRate: 0.04,      // 4% semi-annual
  periodsPerYear: 2,
  yearsToMaturity: 5,
  yieldToMaturity: 0.045 // YTM 4.5%
};

const fi = new FixedIncome();
console.log({
  cleanPrice: fi.calculatePrice(treasuryBond),     // ~987.65
  duration: fi.calculateDuration(treasuryBond),    // ~4.6 years
  convexity: fi.calculateConvexity(treasuryBond)   // ~22.1
});
