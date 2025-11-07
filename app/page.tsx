import Image from "next/image";

"use client";

import { use, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

const ABI = [
  "function createProposal(string title,string description)",
  "function getProposals() view returns(tuple(uint256 id,address author,string title,string description,uint256 createdAt)[])",
  "event ProposalCreated(uint256 indexed id, address indexed author, string title)"
] as const;


type Proposal = {
  id: bigint;
  author: string;
  title:string;
  description:string;
  createdAt: bigint;
};



export default function Home() {
  const [account, setAccount] = useState<string>();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [busy, setBusy] = useState(false);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
  const hasMM = typeof window !== "undefined" && (window as any).ethereum;

  const { provider, signer, contract } = useMemo(() => {
    if (!hasMM) return { provider: undefined, signer: undefined, contract: undefined };
    const prov = new ethers.BrowserProvider((window as any).ethereum);
    const ctr = new ethers.Contract(contractAddress, ABI, prov);
    return { provider: prov, signer: undefined, contract: ctr };
  }, [contractAddress, hasMM]);


  async function connect() {
    if (!hasMM) return alert("MetaMask is not installed");
     const prov = new ethers.BrowserProvider((window as any).ethereum);
    const accs = await prov.send("eth_requestAccounts", []);
    setAccount(accs[0]);
  }

  async function loadProposals() {

    if (!contract) return;
    const list = await contract.getProposals();
    setProposals(list);
  }


  async function onSubmite(e: React.FormEvent) {

    e.preventDefault();
    if(!provider) return;
    setBusy(true);
    try{
    const s = await provider.getSigner();
    const write = new ethers.Contract(contractAddress, ABI, s);
      const tx = await write.createProposal(title.trim(), desc.trim());
      await tx.wait();
      setTitle("");
      setDesc("");
      await loadProposals();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "transaction failed");
    } finally {
      setBusy(false);
    }

  }
useEffect(() => {
    loadProposals();
    if(!contract) return;
    const handler = () => loadProposals();
    contract.on("ProposalCreated", handler);
    return () => {
      contract.off("ProposalCreated", handler);
    };




  }
  }

