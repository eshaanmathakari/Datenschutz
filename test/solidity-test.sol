// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint256) public balances;
    
    // Reentrancy Vulnerability
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    // Reentrancy vulnerability in withdrawal function
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient funds");
        
        // Vulnerable to reentrancy attack
        payable(msg.sender).transfer(amount);  // External call (transfer) before updating state
        balances[msg.sender] -= amount;
    }

    // Unchecked Call Vulnerability
    function unsafeSend(address recipient, uint256 amount) public {
        (bool success, ) = recipient.call{value: amount}("");  // Unchecked call, no validation
        require(success, "Transfer failed");
    }
}
