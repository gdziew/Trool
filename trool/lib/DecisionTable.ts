/**
 * Decision Table class. Execute a group of rules on a table. There are two categories of
 * operations: Condition operations and Action operations.
 *
 * created by Sean Maxwell Mar 3, 2019
 */

import TableErrs from './TableErrs';
import {ImportsObj, Row, parseCell, compareVals, valsToArr} from './shared';


class DecisionTable {

    private readonly id: number;
    private readonly _factName: string;
    private readonly showLogs: boolean | undefined;
    private readonly tableErrs: TableErrs;

    private arrTable: Array<Row>;
    private importsObj: ImportsObj;
    private facts: InstanceType<any>[];
    private conditions: Function[];
    private actions: Function[];


    constructor(id: number, factName: string, showLogs?: boolean) {

        this.id = id;
        this._factName = factName;
        this.showLogs = showLogs;
        this.tableErrs = new TableErrs(id);

        this.arrTable = [];
        this.importsObj = {};
        this.facts = [];
        this.conditions = [];
        this.actions = [];
    }

    get factName() {
        return this._factName;
    }


    /*********************************************************************************************
     *                                  Initialize Table
     ********************************************************************************************/

    public initTable(arrTable: Array<Row>, factsArr: Object[], importsObj: ImportsObj): void {

        this.arrTable = arrTable;
        this.facts = factsArr;
        this.importsObj = importsObj;

        const colHeaderArr = valsToArr(arrTable[0]);
        const opsStrArr = valsToArr(arrTable[1]);

        if (colHeaderArr.length !== opsStrArr.length) {
            throw Error(this.tableErrs.colLenth);
        }

        let conditionsDone = false;
        this.conditions = [];
        this.actions = [];

        for (let i = 1; i < colHeaderArr.length; i++) {

            if (colHeaderArr[i] === 'Condition') {

                if (conditionsDone) {
                    throw Error(this.tableErrs.colHeaderArgmt);
                }

                const condFunc = this.getCondOps(opsStrArr[i]);
                this.conditions.push(condFunc);
                conditionsDone = (colHeaderArr[i + 1] === 'Action');

            } else if (colHeaderArr[i] === 'Action') {

                if (!conditionsDone) {
                    throw Error(this.tableErrs.colHeaderArgmt);
                }

                const actionFunc = this.getActionOps(opsStrArr[i]);
                this.actions.push(actionFunc);
                if (!colHeaderArr[i + 1]) { break; }

            } else {
                throw Error(this.tableErrs.colHeader);
            }
        }
    }


    private getCondOps(opStr: string): Function {

        const outer = this;

        return (factIdx: any, paramVal: any): boolean => {

            const fact = outer.facts[factIdx];
            const arr = opStr.split(' ');
            const methodName = arr[0].replace('()', '');

            if (!opStr) {
                throw Error(outer.tableErrs.condBlank);
            } else if (arr.length !== 3) {
                throw Error(outer.tableErrs.opFormat);
            } else if (fact[methodName] === undefined) {
                throw Error(outer.tableErrs.attrUndef(opStr));
            } else if (arr[2] !== '$param') {
                throw Error(outer.tableErrs.mustEndWithParam);
            }

            let attrVal = null;
            if (typeof fact[methodName] === 'function') {
                attrVal = fact[methodName]();
            } else  {
                attrVal = fact[methodName];
            }

            return compareVals(arr[1], attrVal, paramVal);
        };
    }


    private getActionOps(actionStr: string): Function {

        const outer = this;

        return (factIdx: number, cellVals: any[]): void => {

            const opArr = actionStr.split(' ');

            // assignment
            if (opArr.length === 3) {
                if (opArr[1] === '=') {

                }

            }


            const argLength = actionStr.split('$param').length - 1;

            if (argLength !== cellVals.length) {
                throw Error(outer.tableErrs.paramCount);
            }

            const n = actionStr.lastIndexOf('(');
            const methodName = actionStr.substring(0, n);

            outer.facts[factIdx][methodName](...cellVals);
        };
    }


    /*********************************************************************************************
     *                                  Update Facts
     ********************************************************************************************/

    public updateFacts(): Object[] {

        // Iterate facts
        for (let h = 0; h < this.facts.length; h++) {

            // Iterate rows
            for (let i = 2; i < this.arrTable.length - 1; i++) {

                const ruleArr = valsToArr(this.arrTable[i]);

                if (ruleArr[0] === '') {
                    throw Error(this.tableErrs.ruleNameEmpty);
                }

                let ruleIdx = 1;

                for (let j = 0; j < this.conditions.length; j++) {
                    const condPassed = this.callCondOp(h, j, ruleArr[ruleIdx++]);
                    if (!condPassed) { return this.facts; }
                }

                for (let j = 0; j < this.actions.length; j++) {
                    this.callActionOp(h, j, ruleArr[ruleIdx]);
                }
            }
        }

        return this.facts;
    }


    private callCondOp(factIdx: number, condIdx: number, cellValStr: string): boolean {

        // Don't check condition if cell is empty
        if (cellValStr === '') {
            return true;
        }

        const retVal = parseCell(cellValStr, this.importsObj);

        if (retVal === null) {
            throw Error(this.tableErrs.invalidVal(this.id, cellValStr));
        }

        return this.conditions[condIdx](factIdx, retVal);
    }


    private callActionOp(factIdx: number, actionIdx: number, cellValStr: string): void {

        // Don't call action if cell is empty
        if (cellValStr === '') {
            return;
        }

        const cellVals = cellValStr.split(',');

        for (let i = 0; i < cellVals.length; i++) {
            cellVals[i] = parseCell(cellVals[i], this.importsObj);
        }

        this.actions[actionIdx](factIdx, cellVals);
    }
}

export default DecisionTable;
