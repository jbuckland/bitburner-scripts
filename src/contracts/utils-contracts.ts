import {ArrayJumpingGame1} from '/contracts/array-jumping-game1';
import {ArrayJumpingGame2} from '/contracts/array-jumping-game2';
import {FindLargestPrimeFactor} from '/contracts/find-largest-prime-factor';
import {GenerateIpAddresses} from '/contracts/generate-ip-addresses';
import {HammingCodesBinaryToInteger} from '/contracts/hamming-codes-binary-to-integer';
import {HammingCodesIntegerToBinary} from '/contracts/hamming-codes-integer-to-binary';
import {MergeOverlappingIntervals} from '/contracts/merge-overlapping-intervals';
import {SanitizeParens} from '/contracts/sanitize-parens';
import {ShortestPathInGrid} from '/contracts/shortest-path-in-grid';
import {SpiralizeMatrix} from '/contracts/spiralize-matrix';
import {SubarrayWithMaxSum} from '/contracts/subarray-with-max-sum';
import {IContractSolver} from '/contracts/types';
import {CodingContractType} from '/lib/consts';
import {NS} from '/NetscriptDefinitions';
import {IContract} from '/types';

export function getSolverForContract(ns: NS, contractName: IContract): IContractSolver | undefined {
    let solver: IContractSolver | undefined;

    let contractType = ns.codingcontract.getContractType(contractName.filename, contractName.host) as CodingContractType;

    switch (contractType) {

        case CodingContractType.arrayJumpingGame1:
            solver = new ArrayJumpingGame1(ns);
            break;
        case CodingContractType.arrayJumpingGame2:
            solver = new ArrayJumpingGame2(ns);
            break;
        case CodingContractType.mergeOverlappingIntervals:
            solver = new MergeOverlappingIntervals(ns);
            break;
        case CodingContractType.findLargestPrimeFactor:
            solver = new FindLargestPrimeFactor(ns);
            break;
        case CodingContractType.generateIpAddresses:
            solver = new GenerateIpAddresses(ns);
            break;
        case CodingContractType.hammingCodesBinToInt:
            solver = new HammingCodesBinaryToInteger(ns);
            break;
        case CodingContractType.hammingCodesIntToBin:
            solver = new HammingCodesIntegerToBinary(ns);
            break;
        case CodingContractType.sanitizeParens:
            solver = new SanitizeParens(ns);
            break;
        case CodingContractType.shortestPathInGrid:
            solver = new ShortestPathInGrid(ns);
            break;
        case CodingContractType.spiralizeMatrix:
            solver = new SpiralizeMatrix(ns);
            break;
        case CodingContractType.subarrayWithMaxSum:
            solver = new SubarrayWithMaxSum(ns);
            break;

        case CodingContractType.unknown:
        case CodingContractType.algorithmicStockTrader1:
        case CodingContractType.algorithmicStockTrader2:
        case CodingContractType.algorithmicStockTrader3:
        case CodingContractType.findAllValidMathExpressions:

        case CodingContractType.uniquePathsInAGrid1:
        case CodingContractType.uniquePathsInAGrid2: //we can't solves these yet
            break;
    }

    return solver;
}
