export interface NeuralIdentity {
  id: string;
  codename: string;
  role: string;
  encryptionLevel: 'Standard' | 'AES-256' | 'Quantum';
  signature: string;
  createdAt: string;
}

const VAULT_KEY = 'neur0n_vault';

export const getVault = (): NeuralIdentity[] => {
  const data = localStorage.getItem(VAULT_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveIdentity = (identity: NeuralIdentity) => {
  const vault = getVault();
  const updated = [identity, ...vault.filter(i => i.id !== identity.id)];
  localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
};

export const deleteIdentity = (id: string) => {
  const vault = getVault();
  const updated = vault.filter(i => i.id !== id);
  localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
};

export const forgeSignature = () => {
  const chars = '0123456789ABCDEF';
  let sig = 'SIG-';
  for (let i = 0; i < 16; i++) {
    sig += chars[Math.floor(Math.random() * chars.length)];
  }
  return sig;
};
