// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.9;

/**
 * @title TestBasics
 * @dev Basic operations & errors for testing
 */
contract TestBasics {

    uint256 private value;

    // custom error
    error ForbiddenNumber(uint number);

    // change event
    event ValueSet(uint256 value);

    function setValue(uint256 _value) public {
        testNumberCustom(_value);
        
        value = _value;

        emit ValueSet(_value);
    }

    function getValue() public view returns (uint256){
        return value;
    }

    // with standard error message
    function testNumberBasic(uint _number) public pure {
        require(_number == 666 || _number == 420 || _number == 69, "This is a forbidden number");
    }

    // with custom error message
    function testNumberCustom(uint _number) public pure {
        if(_number == 666 || _number == 420 || _number == 69)
            revert ForbiddenNumber(_number);
    }
}