const { parseSplitExpense } = require('./utils/split-expense-parser');

const testInputs = [
    "Movie 300 split 2 with Alex",
    "Dinner 600 split with Sam and Ram",
    "Lunch 150 split between me and John",
    "Coffee 50 split 2 with Sarah",
    "Pizza 1000 split among brothers",
];

testInputs.forEach(input => {
    console.log(`Input: "${input}"`);
    try {
        const result = parseSplitExpense(input);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.log('Error:', e.message);
    }
    console.log('-------------------');
});
