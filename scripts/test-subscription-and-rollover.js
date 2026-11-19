// Automated verification test script for Subscription & Rollover functionality
const assert = require('assert');

console.log('🧪 Starting Subscription, Rollover & Gating Test Suite...\n');

// 1. Test Feature Gating Logic
console.log('--- Test 1: Feature Gating Logic ---');
function canUseFeature(subState, feature) {
    if (subState.isPro) return true;

    if (feature === 'auto_upi') {
        return subState.trialActive;
    }

    if (feature === 'csv_import') {
        return subState.csvImportsUsed < 3;
    }

    if (feature === 'ai_scan') {
        const todayStr = new Date().toISOString().split('T')[0];
        const scansUsed = subState.aiScansDate === todayStr ? subState.aiScansUsedToday : 0;
        return scansUsed < 3;
    }

    return false;
}

const freeState = {
    isPro: false,
    plan: 'none',
    trialActive: false,
    trialEndsAt: null,
    csvImportsUsed: 0,
    aiScansDate: new Date().toISOString().split('T')[0],
    aiScansUsedToday: 0,
};

assert.strictEqual(canUseFeature(freeState, 'auto_upi'), false, 'Free user should NOT have auto_upi without trial');
assert.strictEqual(canUseFeature(freeState, 'csv_import'), true, 'Free user with 0 imports can import CSV');
assert.strictEqual(canUseFeature(freeState, 'ai_scan'), true, 'Free user with 0 scans can scan receipt');

// Simulate 3 CSV imports used
const maxCsvState = { ...freeState, csvImportsUsed: 3 };
assert.strictEqual(canUseFeature(maxCsvState, 'csv_import'), false, 'Free user with 3 CSV imports is gated');

// Simulate 3 AI scans used
const maxScansState = { ...freeState, aiScansUsedToday: 3 };
assert.strictEqual(canUseFeature(maxScansState, 'ai_scan'), false, 'Free user with 3 daily AI scans is gated');

// Simulate 7-day trial active
const trialState = { ...freeState, trialActive: true, trialEndsAt: new Date(Date.now() + 7 * 86400000).toISOString() };
assert.strictEqual(canUseFeature(trialState, 'auto_upi'), true, 'Trial user gets auto_upi enabled');

// Simulate Pro user
const proState = { ...freeState, isPro: true, plan: 'yearly', csvImportsUsed: 99, aiScansUsedToday: 99 };
assert.strictEqual(canUseFeature(proState, 'auto_upi'), true, 'Pro user gets unlimited auto_upi');
assert.strictEqual(canUseFeature(proState, 'csv_import'), true, 'Pro user gets unlimited CSV imports');
assert.strictEqual(canUseFeature(proState, 'ai_scan'), true, 'Pro user gets unlimited AI scans');
console.log('✅ Feature Gating logic passed!\n');

// 2. Test Rollover Math
console.log('--- Test 2: Budget & Income Rollover Math ---');
function calculateRenewedBudget(budget, expenses) {
    const base = budget.baseAmount ?? budget.amount;
    let newAmount = base;
    let rolloverBonus = 0;

    if (budget.rolloverLeftover) {
        const prevStart = new Date(budget.startDate);
        const prevEnd = new Date(budget.endDate);
        const prevExpenses = expenses.filter(e => {
            if (e.isDeleted) return false;
            const d = new Date(e.date);
            return d >= prevStart && d <= prevEnd;
        });
        const totalPrevSpent = prevExpenses.reduce((sum, e) => sum + e.amount, 0);
        const leftover = budget.amount - totalPrevSpent;
        if (leftover > 0) {
            rolloverBonus = leftover;
            newAmount = base + leftover;
        }
    }

    return {
        amount: newAmount,
        baseAmount: base,
        rolloverBonus,
    };
}

const budgetStartDate = '2026-09-01T00:00:00.000Z';
const budgetEndDate = '2026-09-30T23:59:59.999Z';

// Scenario A: College student with ₹10,000 budget, spent ₹7,500, rollover ON
const studentBudget = {
    amount: 10000,
    baseAmount: 10000,
    startDate: budgetStartDate,
    endDate: budgetEndDate,
    autoRenew: true,
    rolloverLeftover: true,
};
const studentExpenses = [
    { amount: 5000, date: '2026-09-05T12:00:00.000Z', isDeleted: false },
    { amount: 2500, date: '2026-09-15T12:00:00.000Z', isDeleted: false },
];
const renewedStudent = calculateRenewedBudget(studentBudget, studentExpenses);
assert.strictEqual(renewedStudent.rolloverBonus, 2500, 'Leftover should be 2500');
assert.strictEqual(renewedStudent.amount, 12500, 'New budget should be 10000 base + 2500 leftover = 12500');
assert.strictEqual(renewedStudent.baseAmount, 10000, 'Base budget remains 10000');

// Scenario B: Professional salary ₹60,000, rollover OFF (fresh cycle)
const salaryBudget = {
    amount: 60000,
    baseAmount: 60000,
    startDate: budgetStartDate,
    endDate: budgetEndDate,
    autoRenew: true,
    rolloverLeftover: false,
};
const salaryExpenses = [
    { amount: 20000, date: '2026-09-10T12:00:00.000Z', isDeleted: false },
];
const renewedSalary = calculateRenewedBudget(salaryBudget, salaryExpenses);
assert.strictEqual(renewedSalary.rolloverBonus, 0, 'Rollover bonus should be 0 when rollover is OFF');
assert.strictEqual(renewedSalary.amount, 60000, 'New amount should cleanly reset to 60000 base');

// Scenario C: Overspent budget (spent 12000 on 10000 budget), rollover ON
const overspentExpenses = [
    { amount: 12000, date: '2026-09-20T12:00:00.000Z', isDeleted: false },
];
const renewedOverspent = calculateRenewedBudget(studentBudget, overspentExpenses);
assert.strictEqual(renewedOverspent.rolloverBonus, 0, 'No bonus when overspent');
assert.strictEqual(renewedOverspent.amount, 10000, 'New budget resets safely to 10000 base without penalizing base');

console.log('✅ Rollover Math passed with all scenarios!\n');

console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY! 🚀');
