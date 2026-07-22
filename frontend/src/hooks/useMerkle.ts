// STUB — will be replaced in Task 10
export function useMerkle() {
  return {
    buildFromCSV: (_addrs: string[]) => {},
    root: null as string | null,
    addresses: [] as string[],
    getProofFor: (_address: string): string[] => [],
    uploadToIPFS: async (_file: File): Promise<string | null> => null,
  };
}
