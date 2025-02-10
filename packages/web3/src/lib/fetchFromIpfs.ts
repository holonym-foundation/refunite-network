const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

export const fetchFromIpfs = async (cid: string) => {
  const res = await fetch(`https://${cid}.ipfs.dweb.link`);
  return await res.json();
};

const fetchWithFallback = async (uri: string) => {
  const cid = uri.replace("ipfs://", "");
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(gateway + cid);
      if (response.ok) return response.json();
    } catch (error) {
      continue;
    }
  }
  throw new Error("Failed to fetch from all IPFS gateways");
};
