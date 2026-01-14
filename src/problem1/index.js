const sumIteratively = function(n) {
    let sum = 0;
    for (let i = 1; i <= n; i++) {
        sum += i;
    }
    return sum;
};

const sumWithReduce = function(n) {
    return Array.from({ length: n }, (_, i) => i + 1)
        .reduce((sum, num) => sum + num, 0);
};

const sumWithFormula = function(n) {
    return (n * (n + 1)) / 2;
};
