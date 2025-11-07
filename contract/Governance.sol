// SPDX-License-Identifier: GPL-3.0

// Smart Contract:

  //  *   Write a simple Solidity smart contract that allows users to:

   //     *   Create a proposal (with a title and description).
    //    *   Retrieve all proposals.

  //  *   Deploy the smart contract to a test network (Rinkeby or Goerli).


pragma solidity >=0.8.2 <0.9.0;

contract Governance{
struct Proposal{
    uint256 id;
    address author;
    string title;
    string description;
    uint64 createdAt;
}

Proposal[] private  proposals;

event ProposalCreated(uint256 indexed id,address indexed author, string title);

function cretatedProposal(string calldata title, string calldata description) external {
uint256 id  = proposals.length;
proposals.push(Proposal({

    id:id,
    author:msg.sender,
    title:title,
    description:description,
    createdAt: uint64 (block.timestamp)
   


}));
 emit ProposalCreated(id, msg.sender, title);
 }

 function getProposals() external  view returns (Proposal[] memory){
    return  proposals;

}

 function proposalsCout() external  view returns (uint256){
    return  proposals.length;

}



}
