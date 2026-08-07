import { Connection, ParsedInstruction, PublicKey, PartiallyDecodedInstruction } from '@solana/web3.js';
import { BuiltInstruction } from './instructions/types';
import { getTemplateById } from './instructions/templates';

function isParsedInstruction(ix: ParsedInstruction | PartiallyDecodedInstruction): ix is ParsedInstruction {
  return (ix as ParsedInstruction).parsed !== undefined;
}

type AccountKeyLike = {
  pubkey: PublicKey | string;
  signer?: boolean;
  writable?: boolean;
};

export type ParsedMessageLike = {
  accountKeys?: AccountKeyLike[];
  instructions: Array<ParsedInstruction | PartiallyDecodedInstruction>;
};

function pubkeyStr(pk: PublicKey | string): string {
  return typeof pk === 'string' ? pk : pk.toBase58();
}

function customBuilt(
  programId: string,
  signature: string,
  name: string,
  accounts: Record<string, string>,
  dynamicAccounts: BuiltInstruction['template']['accounts'],
  args: Record<string, unknown>
): BuiltInstruction {
  const baseTemplate = getTemplateById('custom_instruction')!;
  return {
    template: {
      ...baseTemplate,
      programId,
      name,
      description: `Imported from signature ${signature.slice(0, 8)}…`,
      accounts: dynamicAccounts.length > 0 ? dynamicAccounts : baseTemplate.accounts,
      args: Object.keys(args).map((k) => ({
        name: k,
        type: 'string' as const,
        description: k,
      })),
    },
    accounts,
    args,
  };
}

export function mapParsedIxToBuilt(
  ix: ParsedInstruction | PartiallyDecodedInstruction,
  signature: string,
  accountKeys: AccountKeyLike[] = []
): BuiltInstruction | null {
  if (isParsedInstruction(ix)) {
    const program = ix.program;
    const type = ix.parsed?.type;
    const info = ix.parsed?.info || {};

    if (program === 'system') {
      if (type === 'transfer') {
        const template = getTemplateById('system_transfer');
        if (template) {
          return {
            template,
            accounts: { from: info.source, to: info.destination },
            args: { amount: info.lamports },
          };
        }
      }
      if (type === 'createAccount') {
        const template = getTemplateById('system_create_account');
        if (template) {
          return {
            template,
            accounts: { from: info.source, newAccount: info.newAccount },
            args: { space: info.space },
          };
        }
      }
    }

    if (program === 'spl-token' || program === 'spl-token-2022') {
      if (type === 'transfer' || type === 'transferChecked') {
        const template = getTemplateById('spl_token_transfer');
        if (template) {
          return {
            template,
            accounts: {
              source: info.source,
              destination: info.destination,
              authority: info.authority || info.multisigAuthority,
            },
            args: { amount: info.tokenAmount?.amount ?? info.amount },
          };
        }
      }
      if (type === 'mintTo' || type === 'mintToChecked') {
        const template = getTemplateById('spl_token_mint_to');
        if (template) {
          return {
            template,
            accounts: {
              mint: info.mint,
              destination: info.account,
              authority: info.mintAuthority,
            },
            args: { amount: info.tokenAmount?.amount ?? info.amount },
          };
        }
      }
      if (type === 'burn' || type === 'burnChecked') {
        const template = getTemplateById('spl_token_burn');
        if (template) {
          return {
            template,
            accounts: {
              source: info.account,
              mint: info.mint,
              authority: info.authority,
            },
            args: { amount: info.tokenAmount?.amount ?? info.amount },
          };
        }
      }
    }

    if (program === 'spl-associated-token-account') {
      if (type === 'create' || type === 'createIdempotent') {
        const template = getTemplateById('spl_ata_create');
        if (template) {
          return {
            template,
            accounts: {
              funding: info.source || info.payer,
              associatedToken: info.account,
              wallet: info.wallet,
              mint: info.mint,
            },
            args: {},
          };
        }
      }
    }

    return customBuilt(
      pubkeyStr(ix.programId),
      signature,
      `Imported ${ix.program || 'ix'}`,
      {},
      [],
      { data: JSON.stringify(ix.parsed) }
    );
  }

  const accounts: Record<string, string> = {};
  const dynamicAccounts: BuiltInstruction['template']['accounts'] = [];
  ix.accounts.forEach((acc, i) => {
    const name = `Account ${i + 1}`;
    const addr = pubkeyStr(acc);
    accounts[name] = addr;
    const accountKey = accountKeys.find((ak) => pubkeyStr(ak.pubkey) === addr);
    const type = accountKey
      ? accountKey.signer
        ? 'signer'
        : accountKey.writable
          ? 'writable'
          : 'readonly'
      : 'readonly';
    dynamicAccounts.push({
      name,
      type,
      description: `Imported account ${i + 1}`,
    });
  });

  return customBuilt(
    pubkeyStr(ix.programId),
    signature,
    'Imported Instruction',
    accounts,
    dynamicAccounts,
    { data: ix.data }
  );
}

export function mapParsedMessageToBuiltInstructions(
  message: ParsedMessageLike,
  signature: string
): BuiltInstruction[] {
  const out: BuiltInstruction[] = [];
  for (const ix of message.instructions || []) {
    const built = mapParsedIxToBuilt(ix, signature, message.accountKeys || []);
    if (built) out.push(built);
  }
  return out;
}

export async function importTransaction(
  connection: Connection,
  signature: string
): Promise<BuiltInstruction[]> {
  const tx = await connection.getParsedTransaction(signature.trim(), {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || !tx.transaction) throw new Error('Transaction not found');

  const instructions = mapParsedMessageToBuiltInstructions(tx.transaction.message, signature.trim());
  if (!instructions.length) {
    throw new Error('No instructions found in that transaction');
  }
  return instructions;
}
