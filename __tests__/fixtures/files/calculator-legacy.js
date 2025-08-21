// Simple calculator with some issues that need fixing
function Calculator() {
  this.result = 0;
}

Calculator.prototype.add = function(num) {
  this.result = this.result + num;
  return this;
}

Calculator.prototype.subtract = function(num) {
  this.result = this.result - num;
  return this;
}

Calculator.prototype.multiply = function(num) {
  this.result = this.result * num;
  return this;
}

Calculator.prototype.divide = function(num) {
  this.result = this.result / num;  // No division by zero check!
  return this;
}

Calculator.prototype.getResult = function() {
  return this.result;
}

// Usage example with poor error handling
var calc = new Calculator();
calc.add(10).multiply(2).divide(0).subtract(5);  // This will cause issues!
console.log("Result:", calc.getResult());

// TODO: Add input validation, error handling, and convert to modern ES6 class syntax