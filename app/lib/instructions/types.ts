// Instruction template definitions
export interface InstructionTemplate {
  id: string;
  programId: string;
  name: string;
  description: string;
  accounts: AccountRequirement[];
  args: Argument[];
  category: 'system' | 'token' | 'nft' | 'defi' | 'custom';
}

export interface AccountRequirement {
  name: string;
  type: 'signer' | 'writable' | 'readonly';
  description: string;
  pubkey?: string; // For derived accounts
  isOptional?: boolean;
}

export interface Argument {
  name: string;
  type: 'u64' | 'u32' | 'u16' | 'u8' | 'i64' | 'i32' | 'pubkey' | 'string' | 'bool' | 'bytes';
  description: string;
  defaultValue?: any;
  isOptional?: boolean; // Add this property
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface BuiltInstruction {
  template: InstructionTemplate;
  accounts: Record<string, string>; // account name -> pubkey
  args: Record<string, any>; // arg name -> value
}

export interface TransactionDraft {
  instructions: BuiltInstruction[];
  priorityFee?: number;
  memo?: string;
}
