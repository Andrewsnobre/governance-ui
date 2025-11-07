"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

const ABI = [
  "function createProposal(string title,string description)",
  "function getProposals() view returns(tuple(uint256 id,address author,string title,string description,uint64 createdAt)[])",
  "event ProposalCreated(uint256 indexed id, address indexed author, string title)",
] as const;

type Proposal = {
  id: bigint;
  author: string;
  title: string;
  description: string;
  createdAt: bigint; // ethers decodifica para bigint
};

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111"); // Sepolia

export default function Home() {
  const [account, setAccount] = useState<string>();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const hasMM = typeof window !== "undefined" && (window as any).ethereum;

  const provider = useMemo(() => {
    if (!hasMM) return undefined;
    return new ethers.BrowserProvider((window as any).ethereum);
  }, [hasMM]);

  const contract = useMemo(() => {
    if (!provider || !ethers.isAddress(CONTRACT_ADDRESS)) return undefined;
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  }, [provider]);

  async function ensureNetworkAndCode() {
    if (!provider || !ethers.isAddress(CONTRACT_ADDRESS)) {
      setStatus("Defina NEXT_PUBLIC_CONTRACT_ADDRESS e conecte a carteira.");
      return false;
    }
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== EXPECTED_CHAIN_ID) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x" + EXPECTED_CHAIN_ID.toString(16) }],
        });
      } catch {
        setStatus(`Troque a rede na MetaMask para chainId ${EXPECTED_CHAIN_ID}.`);
        return false;
      }
    }
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (!code || code === "0x") {
      setStatus("Endereço não tem código na rede atual. Verifique o deploy e o .env.");
      return false;
    }
    setStatus("");
    return true;
  }

  async function connect() {
    if (!provider) return alert("MetaMask não detectado.");
    try {
      const [acc] = await provider.send("eth_requestAccounts", []);
      setAccount(acc);
    } catch { /* usuário cancelou */ }
  }

  async function loadProposals() {
    if (!contract) return;
    try {
      if (!(await ensureNetworkAndCode())) return;
      const list = (await contract.getProposals()) as Proposal[];
      setProposals(list);
    } catch (e: any) {
      console.error(e);
      setStatus("Falha ao ler getProposals(). Cheque endereço/ABI/rede.");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) return;
    setBusy(true);
    try {
      if (!(await ensureNetworkAndCode())) return;
      const signer = await provider.getSigner();
      const write = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await write.createProposal(title.trim(), desc.trim());
      await tx.wait();
      setTitle(""); setDesc("");
      await loadProposals();
    } catch (err: any) {
      console.error(err);
      alert(err?.shortMessage || err?.message || "transaction failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!contract) return;
    loadProposals();
    const h = () => loadProposals();
    contract.on("ProposalCreated", h);
    return () => { contract.off("ProposalCreated", h); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract]);

  return (
    <div style={{ maxWidth: 760, margin: "40px auto", padding: 16, fontFamily: "ui-sans-serif, system-ui" }}>
      {status && (
        <div style={{ background: "#fff3cd", border: "1px solid #ffeeba", padding: 10, marginBottom: 12 }}>{status}</div>
      )}

      <h1>Governance Proposals</h1>

      <div style={{ marginBottom: 16 }}>
        {account ? (
          <span>Connected: {account.slice(0, 6)}…{account.slice(-4)}</span>
        ) : (
          <button onClick={connect}>Connect MetaMask</button>
        )}
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea placeholder="Description" rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} required />
        <button type="submit" disabled={!account || busy}>{busy ? "Submitting..." : "Create Proposal"}</button>
      </form>

      <div style={{ display: "grid", gap: 12 }}>
        <button onClick={loadProposals}>Refresh List</button>
        {proposals.length === 0 && <p>No proposals yet.</p>}
        {proposals.map((p) => (
          <div key={p.id.toString()} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 600 }}>{p.title}</div>
            <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{p.description}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
              by {p.author.slice(0, 6)}…{p.author.slice(-4)} · {new Date(Number(p.createdAt) * 1000).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
