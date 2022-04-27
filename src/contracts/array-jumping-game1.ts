import {IContractSolver} from '/contracts/types';
import {CodingContractType} from '/lib/consts';
import {NS} from '/NetscriptDefinitions';

export class ArrayJumpingGame1 implements IContractSolver {
    public debug: boolean = false;


    public type: CodingContractType = CodingContractType.arrayJumpingGame1;

    /**Array Jumping Game
     You are given the following array of integers:

     7,4,0,4,0,4,0,8,1,0,4,5,8,10,0,9,0,7

     Each element in the array represents your MAXIMUM jump length at that position. This means that if you are at position i and your maximum jump length is n, you can jump to any position from i to i+n.

     Assuming you are initially positioned at the start of the array, determine whether you are able to reach the last index.

     Your answer should be submitted as 1 or 0, representing true and false respectively

     */

    constructor(private ns: NS) {
    }

    public solve(input: number[]): string[] | number {
        let canReachEnd = false;

        let numberArray: number[] = input;

        let moveQueue: IMove[] = [
            {position: 0, jumpCount: 0}
        ];

        while (moveQueue.length > 0) {

            let currMove = moveQueue.shift();
            if (currMove) {

                if (currMove.position === numberArray.length - 1) {
                    canReachEnd = true;
                    break;

                } else {
                    let jumpLength = numberArray[currMove.position];

                    for (let i = 1; i <= jumpLength; i++) {
                        moveQueue.push({
                            position: currMove.position + i,
                            jumpCount: currMove.jumpCount + 1
                        });
                    }
                }

            } else {
                throw new Error(`Queue was empty when it shouldn't have been!`);
            }
            //console.log(`ArrayJumpingGame2`, moveQueue);
        }


        return Number(canReachEnd);

    }

}

interface IMove {
    jumpCount: number
    position: number,
}
