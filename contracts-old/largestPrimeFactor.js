/*
Find Largest Prime Factor
A prime factor is a factor that is a prime number. What is the largest prime factor of 948,027,250?
 */


//find all the prime numbers up to X/2 (inclusive)
//starting from the top, find the first one that divides evenly into X

//finds primes up to a given number

//let targetNumber = 948027250;
//let targetNumber = 159311770;

let targetNumber = 159311770;


//let primes = sieveOfEratosthenes(targetNumber / 2);
//console.log(`Prime Numbers:`, primes);

let largestPrimeFactor = maxPrimeFactor(targetNumber);

console.log(`Largest Prime factor of ${targetNumber}: ${largestPrimeFactor}`)


function maxPrimeFactor(n) {
    let maxPrime = -1;
    while (n % 2 === 0) {
        n = n / 2;
        maxPrime = 2;
    }

    while (n % 3 === 0) {
        n = n / 3;
        maxPrime = 3;
    }

    for (let i = 5; i <= Math.sqrt(n); i += 6) {
        while (n % i === 0) {
            maxPrime = i;
            n = n / i;
        }
        while (n % (i + 2) === 0) {
            maxPrime = i + 2;
            n = n / (i + 2);
        }
    }

    if (n > 4) {
        return n;
    } else {
        return maxPrime;
    }
}
