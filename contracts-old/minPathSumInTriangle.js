/*
Minimum Path Sum in a Triangle
Given a triangle, find the minimum path sum from top to bottom. In each step of the path, you may only move to adjacent numbers in the row below. The triangle is represented as a 2D array of numbers:

[
      [7],
     [5,6],
    [4,5,1],
   [9,6,8,1],
  [4,9,2,9,1]
]

Example: If you are given the following triangle:

[
     [2],
    [3,4],
   [6,5,7],
  [4,1,8,3]
]

The minimum path sum is 11 (2 -> 3 -> 5 -> 1).


Hand Solving:
start at the bottom,
for each pair of destinations from a parent, replace the parent cost with the lower of the two child costs


Q:[
      [7],
     [5,6],
    [4,5,1],
   [9,6,8,1],
  [4,9,2,9,1]
]
A: 16 (7>6>1>1>1), solved by hand.

 */
